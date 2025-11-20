import React, {
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useEffect
} from "react";

/**
 * Notes:
 * - Replace YOUR_TURN_URL, TURN_USER, TURN_PASS with your Coturn / provider values.
 * - Ensure server signaling endpoint ("/app/call") matches backend.
 */

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  {
    urls: "turn:YOUR_TURN_URL:3478",
    username: "TURN_USER",
    credential: "TURN_PASS"
  }
];

const DEFAULT_VIDEO_CONSTRAINTS = {
  audio: true,
  video: {
    width: { ideal: 640, max: 720 },
    height: { ideal: 480, max: 720 },
    frameRate: { ideal: 24, max: 30 }
  }
};

const VideoCall = forwardRef(({ currentUser, targetUser, onClose }, ref) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const candidateQueue = useRef([]);
  const [callState, setCallState] = useState("idle"); // idle, calling, ringing, in-call
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  useEffect(() => {
    // cleanup on unmount
    return () => cleanupCall();
  }, []);

  // Send signaling to backend via STOMP
  const sendSignal = (msg) => {
    try {
      if (window.stompClient?.connected) {
        // Using same endpoint you used previously
        window.stompClient.send("/app/call", {}, JSON.stringify(msg));
      } else {
        console.error("WebSocket STOMP not connected");
      }
    } catch (e) {
      console.error("sendSignal error", e);
    }
  };

  const startLocalStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia(DEFAULT_VIDEO_CONSTRAINTS);
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  };

  const applyVideoBitrateCap = async (pc, kbps = 900) => {
    // apply to first video sender if present (Chrome-support)
    try {
      const senders = pc.getSenders ? pc.getSenders() : [];
      const videoSender = senders.find(s => s.track && s.track.kind === "video");
      if (videoSender && videoSender.getParameters) {
        let params = videoSender.getParameters();
        if (!params.encodings) params.encodings = [{}];
        // set max bitrate in bps
        params.encodings[0].maxBitrate = kbps * 1000;
        await videoSender.setParameters(params);
        console.log("Applied video bitrate cap:", kbps, "kbps");
      }
    } catch (e) {
      // non-fatal: some browsers don't support setParameters for bitrate
      console.warn("Could not set sender bitrate:", e);
    }
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: "candidate",
          from: currentUser.username,
          to: targetUser,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      // if multiple tracks, streams[0] is common
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };

    pc.onconnectionstatechange = () => {
      console.log("PC connectionState:", pc.connectionState);
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        // attempt graceful cleanup
        hangup(true);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("PC iceConnectionState:", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") {
        // try restart or cleanup
        hangup(true);
      }
    };

    // Add local tracks (if already captured)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pcRef.current = pc;

    // Apply queued ICE candidates
    if (candidateQueue.current.length) {
      candidateQueue.current.forEach(async (c) => {
        try {
          await pc.addIceCandidate(c);
        } catch (e) {
          console.warn("late candidate add failed:", e);
        }
      });
      candidateQueue.current = [];
    }

    return pc;
  };

  // Caller → create offer
  const startCallAsCaller = async () => {
    try {
      setCallState("calling");
      await startLocalStream();
      const pc = createPeerConnection();
      await applyVideoBitrateCap(pc, 900); // set ~900 kbps cap (adjust as needed)

      // ensure tracks are added before creating offer
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => {
          // if sender already added, skip else add
          // we added in createPeerConnection already
        });
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignal({
        type: "offer",
        from: currentUser.username,
        to: targetUser,
        sdp: offer.sdp
      });

      // optional: send ring event
      sendSignal({ type: "ring", from: currentUser.username, to: targetUser });
    } catch (e) {
      console.error("startCallAsCaller error", e);
      hangup(false);
    }
  };

  // Receiver → handle offer → create answer
  const handleOffer = async (msg) => {
    try {
      setCallState("ringing");
      await startLocalStream();
      const pc = createPeerConnection();

      // set remote description
      await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });

      // create and set answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // apply bitrate cap after local description
      await applyVideoBitrateCap(pc, 900);

      sendSignal({
        type: "answer",
        from: currentUser.username,
        to: msg.from,
        sdp: answer.sdp
      });

      setCallState("in-call");
    } catch (e) {
      console.error("handleOffer error", e);
      hangup(false);
    }
  };

  // Caller → handle answer
  const handleAnswer = async (msg) => {
    try {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription({ type: "answer", sdp: msg.sdp });
      setCallState("in-call");
    } catch (e) {
      console.error("handleAnswer error", e);
    }
  };

  // Both → handle ICE candidate
  const handleCandidate = async (msg) => {
    if (!msg.candidate) return;

    const ice = msg.candidate;
    // If pc not ready, queue
    if (!pcRef.current) {
      candidateQueue.current.push(ice);
      return;
    }

    try {
      await pcRef.current.addIceCandidate(ice);
    } catch (e) {
      console.warn("addIceCandidate error:", e);
    }
  };

  const cleanupCall = () => {
    try {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    } catch (e) {
      console.warn("pc close error", e);
    }

    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    } catch (e) {
      console.warn("stop tracks error", e);
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    candidateQueue.current = [];
    setMuted(false);
    setCameraOff(false);
  };

  // End call (notify peer by default)
  const hangup = (notify = true) => {
    if (notify) {
      sendSignal({
        type: "hangup",
        from: currentUser.username,
        to: targetUser
      });
    }
    cleanupCall();
    setCallState("idle");
    if (onClose) onClose();
  };

  // Mute toggle
  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const audioTracks = localStreamRef.current.getAudioTracks();
    if (audioTracks.length === 0) return;
    audioTracks.forEach(t => (t.enabled = !t.enabled));
    setMuted(prev => !prev);
  };

  // Camera toggle
  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    const videoTracks = localStreamRef.current.getVideoTracks();
    if (videoTracks.length === 0) return;
    videoTracks.forEach(t => (t.enabled = !t.enabled));
    setCameraOff(prev => !prev);
  };

  // Expose handler to parent for incoming signaling
  useImperativeHandle(ref, () => ({
    async handleSignal(signal) {
      switch (signal.type) {
        case "offer":
          await handleOffer(signal);
          break;
        case "answer":
          await handleAnswer(signal);
          break;
        case "candidate":
          await handleCandidate(signal);
          break;
        case "hangup":
          // peer hung up
          cleanupCall();
          setCallState("idle");
          if (onClose) onClose();
          break;
        case "ring":
          // optional: play ringtone / notify UI
          break;
        default:
          console.warn("Unknown signal type:", signal.type);
      }
    }
  }));

  return (
    <div style={{ height: "100%", padding: 10, background: "#111", color: "#fff" }}>
      <div style={{ display: "flex", height: "80%" }}>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          style={{ width: 180, height: 140, background: "#222" }}
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{
            flex: 1,
            background: "black",
            marginLeft: 10
          }}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        {callState === "idle" && (
          <button onClick={startCallAsCaller}>Call {targetUser}</button>
        )}

        {callState === "calling" && <span>📞 Calling...</span>}
        {callState === "ringing" && <span>📳 Incoming call...</span>}

        {callState === "in-call" && (
          <>
            <button onClick={() => hangup(true)}>Hang Up</button>
            <button onClick={toggleMute}>{muted ? "Unmute" : "Mute"}</button>
            <button onClick={toggleCamera}>{cameraOff ? "Camera On" : "Camera Off"}</button>
          </>
        )}
      </div>
    </div>
  );
});

export default VideoCall;
