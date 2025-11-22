import React, {
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useEffect
} from "react";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  // TODO: replace with your real TURN later
  // {
  //   urls: "turn:YOUR_TURN_URL:3478",
  //   username: "TURN_USER",
  //   credential: "TURN_PASS"
  // }
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

  const [callState, setCallState] = useState("idle"); // idle | calling | ringing | in-call
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanupCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ STOMP signaling using publish (NOT send)
  const sendSignal = (msg) => {
    try {
      const client = window.stompClient;
      if (client && client.connected) {
        client.publish({
          destination: "/app/call",
          body: JSON.stringify(msg),
        });
      } else {
        console.error("WebSocket STOMP not connected");
      }
    } catch (e) {
      console.error("sendSignal error", e);
    }
  };

  const startLocalStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia(
      DEFAULT_VIDEO_CONSTRAINTS
    );
    localStreamRef.current = stream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    return stream;
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: "candidate",
          from: currentUser.username,
          to: targetUser,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        hangup(true);
      }
    };

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pcRef.current = pc;
    return pc;
  };

  // Caller → create offer and send
  const startCallAsCaller = async () => {
    try {
      setCallState("calling");

      await startLocalStream();
      const pc = createPeerConnection();

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignal({
        type: "offer",
        from: currentUser.username,
        to: targetUser,
        sdp: offer.sdp,
      });
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

      await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignal({
        type: "answer",
        from: currentUser.username,
        to: msg.from,
        sdp: answer.sdp,
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
      await pcRef.current.setRemoteDescription({
        type: "answer",
        sdp: msg.sdp,
      });
      setCallState("in-call");
    } catch (e) {
      console.error("handleAnswer error", e);
    }
  };

  // Both → handle ICE candidate
  const handleCandidate = async (msg) => {
    try {
      if (!pcRef.current || !msg.candidate) return;
      await pcRef.current.addIceCandidate(msg.candidate);
    } catch (e) {
      console.warn("addIceCandidate error:", e);
    }
  };

  const cleanupCall = () => {
    try {
      if (pcRef.current) {
        pcRef.current.close();
      }
    } catch (e) {
      console.warn("pc close error:", e);
    }
    pcRef.current = null;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    setMuted(false);
    setCameraOff(false);
  };

  const hangup = (notify = true) => {
    if (notify) {
      sendSignal({
        type: "hangup",
        from: currentUser.username,
        to: targetUser,
      });
    }

    cleanupCall();
    setCallState("idle");
    if (onClose) onClose();
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setMuted((prev) => !prev);
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setCameraOff((prev) => !prev);
  };

  // Parent passes signals from WebSocket here
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
          hangup(false);
          break;
        default:
          console.warn("Unknown signal type:", signal.type);
          break;
      }
    },
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
            marginLeft: 10,
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
            <button onClick={toggleCamera}>
              {cameraOff ? "Camera On" : "Camera Off"}
            </button>
          </>
        )}
      </div>
    </div>
  );
});

export default VideoCall;
