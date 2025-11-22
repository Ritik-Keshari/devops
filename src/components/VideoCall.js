import React, {
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useEffect
} from "react";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  // TODO: add your TURN server here in future for better reliability
  // {
  //   urls: "turn:YOUR_TURN_URL:3478",
  //   username: "TURN_USER",
  //   credential: "TURN_PASS"
  // }
];

const DEFAULT_VIDEO_CONSTRAINTS = {
  audio: true,
  video: {
    width: { ideal: 1280, max: 1280 },  // HD-ish
    height: { ideal: 720, max: 720 },
    frameRate: { ideal: 24, max: 30 }
  }
};

// Format duration in mm:ss
const formatDuration = (secs) => {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const VideoCall = forwardRef(({ currentUser, targetUser, onClose }, ref) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingOfferRef = useRef(null);

  const ringtoneRef = useRef(null);
  const durationTimerRef = useRef(null);

  const [callState, setCallState] = useState("idle");       // idle | calling | incoming | in-call
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [duration, setDuration] = useState(0);              // in seconds

  // Load ringtone once
  useEffect(() => {
    ringtoneRef.current = new Audio("/ringtone.mp3");
    if (ringtoneRef.current) {
      ringtoneRef.current.loop = true;
      ringtoneRef.current.preload = "auto";
    }

    return () => {
      cleanupCall();
      stopRingtone();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Call duration timer
  useEffect(() => {
    if (callState === "in-call") {
      durationTimerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
      if (callState === "idle") {
        setDuration(0);
      }
    }
    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    };
  }, [callState]);

  // Helpers: ringtone
  const playRingtone = () => {
    try {
      if (ringtoneRef.current) {
        ringtoneRef.current.currentTime = 0;
        ringtoneRef.current.play().catch(() => {});
      }
    } catch {
      // ignore
    }
  };

  const stopRingtone = () => {
    try {
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
    } catch {
      // ignore
    }
  };

  // ✅ STOMP signaling using publish
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
      if (
        pc.iceConnectionState === "failed" ||
        pc.iceConnectionState === "disconnected"
      ) {
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

  // Outgoing: start call
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

  // Incoming: we got OFFER, but we don't auto-accept
  const handleIncomingOffer = (msg) => {
    pendingOfferRef.current = msg;
    setCallState("incoming");
    playRingtone();
  };

  // When user clicks ACCEPT
  const acceptIncomingCall = async () => {
    stopRingtone();
    const offerMsg = pendingOfferRef.current;
    if (!offerMsg) return;

    try {
      await startLocalStream();
      const pc = createPeerConnection();

      await pc.setRemoteDescription({
        type: "offer",
        sdp: offerMsg.sdp,
      });

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

  // When user clicks REJECT
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
    cleanupCall();
    setCallState("idle");
    if (onClose) onClose();
  };

  // Caller side: got ANSWER
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

  // Handle candidate both sides
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

  // Parent passes WebSocket signals here
  useImperativeHandle(ref, () => ({
    async handleSignal(signal) {
      switch (signal.type) {
        case "offer":
          handleIncomingOffer(signal);
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
        case "reject":
          // peer rejected the call
          cleanupCall();
          setCallState("idle");
          if (onClose) onClose();
          break;
        default:
          console.warn("Unknown signal type:", signal.type);
          break;
      }
    },
  }));

  // UI
  const statusText = (() => {
    switch (callState) {
      case "calling":
        return `📞 Calling ${targetUser}...`;
      case "incoming":
        return `📳 Incoming call from ${targetUser}`;
      case "in-call":
        return `In call with ${targetUser} • ${formatDuration(duration)}`;
      default:
        return "";
    }
  })();

  return (
    <div style={{ height: "100%", padding: 10, background: "#111", color: "#fff" }}>
      {/* VIDEO AREA */}
      <div
        style={{
          display: "flex",
          height: "80%",
          position: "relative",
        }}
      >
        {/* REMOTE VIDEO FULL AREA */}
        <div style={{ flex: 1, position: "relative", background: "black" }}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: 8,
              background: "black",
            }}
          />
          {/* LOCAL PIP PREVIEW */}
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              width: 160,
              height: 120,
              objectFit: "cover",
              borderRadius: 8,
              border: "2px solid #fff",
              background: "#222",
            }}
          />
        </div>
      </div>

      {/* CONTROLS AREA */}
      <div style={{ marginTop: 10 }}>
        <div style={{ marginBottom: 8 }}>{statusText}</div>

        {callState === "idle" && (
          <button onClick={startCallAsCaller}>Call {targetUser}</button>
        )}

        {callState === "calling" && (
          <>
            <button onClick={() => hangup(true)}>Cancel</button>
          </>
        )}

        {callState === "incoming" && (
          <>
            <button onClick={acceptIncomingCall}>Accept</button>
            <button onClick={rejectIncomingCall} style={{ marginLeft: 8 }}>
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
