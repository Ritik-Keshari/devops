import React, {
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
];

const DEFAULT_VIDEO_CONSTRAINTS = {
  audio: true,
  video: {
    width: { ideal: 1280, max: 1280 },
    height: { ideal: 720, max: 720 },
    frameRate: { ideal: 24, max: 30 },
  },
};

// -------------------------------------------
//  Duration formatter
// -------------------------------------------
const formatDuration = (secs) => {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const VideoCall = forwardRef(({ currentUser, targetUser, onClose }, ref) => {
  // Video refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // WebRTC
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const candidateQueue = useRef([]); // ⭐ FIX — queue ICE candidates

  // Ringtone
  const ringtoneRef = useRef(null);

  // Timer
  const durationTimerRef = useRef(null);

  // UI State
  const [callState, setCallState] = useState("idle"); // idle | calling | incoming | in-call
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [duration, setDuration] = useState(0);

  // Load ringtone
  useEffect(() => {
    ringtoneRef.current = new Audio("/ringtone.mp3");
    ringtoneRef.current.loop = true;

    return () => {
      stopRingtone();
      cleanupCall();
    };
  }, []);

  // Call duration timer
  useEffect(() => {
    if (callState === "in-call") {
      durationTimerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } else {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
      if (callState === "idle") setDuration(0);
    }
  }, [callState]);

  // -------------------------------------------
  // Ringtones
  // -------------------------------------------
  const playRingtone = () => {
    try {
      ringtoneRef.current.currentTime = 0;
      ringtoneRef.current.play().catch(() => {});
    } catch {}
  };

  const stopRingtone = () => {
    try {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    } catch {}
  };

  // -------------------------------------------
  // STOMP signaling
  // -------------------------------------------
  const sendSignal = (msg) => {
    try {
      const client = window.stompClient;
      if (client?.connected) {
        client.publish({
          destination: "/app/call",
          body: JSON.stringify(msg),
        });
      } else {
        console.error("STOMP not connected");
      }
    } catch (e) {
      console.error("sendSignal error", e);
    }
  };

  // -------------------------------------------
  // Local camera stream
  // -------------------------------------------
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

  // -------------------------------------------
  // Create WebRTC peer connection
  // -------------------------------------------
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
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    pc.oniceconnectionstatechange = () => {
      if (
        pc.iceConnectionState === "failed" ||
        pc.iceConnectionState === "disconnected"
      ) {
        hangup(true);
      }
    };

    // Add tracks
    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current);
    });

    pcRef.current = pc;
    return pc;
  };

  // -------------------------------------------
  // Caller: Start call
  // -------------------------------------------
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

  // -------------------------------------------
  // Incoming OFFER
  // -------------------------------------------
  const handleIncomingOffer = (msg) => {
    pendingOfferRef.current = msg;
    playRingtone();
    setCallState("incoming");
  };

  // Accept call
  const acceptIncomingCall = async () => {
    stopRingtone();
    const offerMsg = pendingOfferRef.current;
    if (!offerMsg) return;

    try {
      await startLocalStream();
      const pc = createPeerConnection();

      await pc.setRemoteDescription(new RTCSessionDescription({
        type: "offer",
        sdp: offerMsg.sdp,
      }));

      // ⭐ Apply queued ICE candidates now
      for (const c of candidateQueue.current) {
        await pc.addIceCandidate(c);
      }
      candidateQueue.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignal({
        type: "answer",
        from: currentUser.username,
        to: offerMsg.from,
        sdp: answer.sdp,
      });

      setCallState("in-call");
    } catch (e) {
      console.error("acceptIncomingCall error", e);
      hangup(false);
    }
  };

  // Reject call
  const rejectIncomingCall = () => {
    const offerMsg = pendingOfferRef.current;
    if (offerMsg) {
      sendSignal({
        type: "reject",
        from: currentUser.username,
        to: offerMsg.from,
      });
    }
    stopRingtone();
    pendingOfferRef.current = null;
    hangup(false);
  };

  // -------------------------------------------
  // Caller receives ANSWER
  // -------------------------------------------
  const handleAnswer = async (msg) => {
    try {
      const pc = pcRef.current;
      if (!pc) return;

      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: "answer", sdp: msg.sdp })
      );

      // ⭐ Apply queued ICE candidates now
      for (const c of candidateQueue.current) {
        await pc.addIceCandidate(c);
      }
      candidateQueue.current = [];

      setCallState("in-call");
    } catch (e) {
      console.error("handleAnswer error", e);
    }
  };

  // -------------------------------------------
  // ICE Candidate Handler
  // -------------------------------------------
  const handleCandidate = async (msg) => {
    const candidate = msg.candidate;
    if (!candidate) return;

    const pc = pcRef.current;

    // ⭐ IMPORTANT — remoteDescription not ready, queue it
    if (!pc || !pc.remoteDescription) {
      console.log("⏳ Queuing ICE candidate");
      candidateQueue.current.push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(candidate);
    } catch (e) {
      console.warn("addIceCandidate error", e);
    }
  };

  // -------------------------------------------
  // Clean everything
  // -------------------------------------------
  const cleanupCall = () => {
    try {
      pcRef.current?.close();
    } catch {}

    pcRef.current = null;

    try {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}

    localStreamRef.current = null;

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    candidateQueue.current = [];
    setMuted(false);
    setCameraOff(false);
  };

  const hangup = (notify = true) => {
    stopRingtone();

    if (notify) {
      sendSignal({
        type: "hangup",
        from: currentUser.username,
        to: targetUser,
      });
    }

    cleanupCall();
    setCallState("idle");
    onClose?.();
  };

  // -------------------------------------------
  // Expose signal handler to parent
  // -------------------------------------------
  useImperativeHandle(ref, () => ({
    async handleSignal(signal) {
      switch (signal.type) {
        case "offer":
          handleIncomingOffer(signal);
          break;

        case "answer":
          handleAnswer(signal);
          break;

        case "candidate":
          handleCandidate(signal);
          break;

        case "hangup":
          hangup(false);
          break;

        case "reject":
          hangup(false);
          break;

        default:
          console.warn("Unknown signal:", signal.type);
      }
    },
  }));

  // UI label
  const statusText = (() => {
    switch (callState) {
      case "calling":
        return `📞 Calling ${targetUser}...`;
      case "incoming":
        return `📳 Incoming call from ${targetUser}`;
      case "in-call":
        return `In call • ${formatDuration(duration)}`;
      default:
        return "";
    }
  })();

  // -------------------------------------------
  // UI
  // -------------------------------------------
  return (
    <div style={{ height: "100%", background: "#111", color: "#fff", padding: 10 }}>
      {/* VIDEO AREA */}
      <div style={{ height: "80%", position: "relative" }}>
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            background: "black",
            borderRadius: 8,
          }}
        />

        {/* Local PIP */}
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          style={{
            position: "absolute",
            bottom: 10,
            right: 10,
            width: 150,
            height: 120,
            borderRadius: 8,
            border: "2px solid white",
            background: "#222",
            objectFit: "cover",
          }}
        />
      </div>

      {/* CONTROLS */}
      <div style={{ marginTop: 15 }}>
        <div style={{ marginBottom: 8 }}>{statusText}</div>

        {callState === "idle" && (
          <button onClick={startCallAsCaller}>Call {targetUser}</button>
        )}

        {callState === "calling" && (
          <button onClick={() => hangup(true)}>Cancel Call</button>
        )}

        {callState === "incoming" && (
          <>
            <button onClick={acceptIncomingCall}>Accept</button>
            <button onClick={rejectIncomingCall} style={{ marginLeft: 10 }}>
              Reject
            </button>
          </>
        )}

        {callState === "in-call" && (
          <>
            <button onClick={() => hangup(true)}>Hang Up</button>
            <button onClick={toggleMute} style={{ marginLeft: 8 }}>
              {muted ? "Unmute" : "Mute"}
            </button>
            <button onClick={toggleCamera} style={{ marginLeft: 8 }}>
              {cameraOff ? "Camera On" : "Camera Off"}
            </button>
          </>
        )}
      </div>
    </div>
  );
});

export default VideoCall;
