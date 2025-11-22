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
  const candidateQueue = useRef([]);

  const ringtoneRef = useRef(null);
  const durationTimerRef = useRef(null);

  const [callState, setCallState] = useState("idle");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    ringtoneRef.current = new Audio("/ringtone.mp3");
    ringtoneRef.current.loop = true;

    return () => {
      cleanupCall();
      stopRingtone();
    };
  }, []);

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

  const playRingtone = () => {
    try {
      ringtoneRef.current.currentTime = 0;
      ringtoneRef.current.play();
    } catch {}
  };

  const stopRingtone = () => {
    try {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    } catch {}
  };

  const sendSignal = (msg) => {
    try {
      const client = window.stompClient;
      if (client?.connected) {
        client.publish({
          destination: "/app/call",
          body: JSON.stringify(msg),
        });
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
      if (pc.iceConnectionState === "failed") {
        hangup(true);
      }
    };

    localStreamRef.current?.getTracks().forEach((t) => {
      pc.addTrack(t, localStreamRef.current);
    });

    pcRef.current = pc;
    return pc;
  };

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
      console.error("startCallAsCaller", e);
      hangup(false);
    }
  };

  const handleIncomingOffer = (msg) => {
    pendingOfferRef.current = msg;
    playRingtone();
    setCallState("incoming");
  };

  const acceptIncomingCall = async () => {
    stopRingtone();

    const offerMsg = pendingOfferRef.current;
    if (!offerMsg) return;

    try {
      await startLocalStream();
      const pc = createPeerConnection();

      await pc.setRemoteDescription(
        new RTCSessionDescription({
          type: "offer",
          sdp: offerMsg.sdp,
        })
      );

      // ⭐ remoteDescription is now set → flush queued candidates
      for (const c of candidateQueue.current) {
        try {
          await pc.addIceCandidate(c);
        } catch (err) {
          console.warn("flush candidate (offer) failed:", err);
        }
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
      console.error("acceptIncomingCall", e);
      hangup(false);
    }
  };

  const rejectIncomingCall = () => {
    const offer = pendingOfferRef.current;
    if (offer) {
      sendSignal({
        type: "reject",
        from: currentUser.username,
        to: offer.from,
      });
    }
    stopRingtone();
    hangup(false);
  };

  const handleAnswer = async (msg) => {
    try {
      const pc = pcRef.current;
      if (!pc) return;

      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: "answer", sdp: msg.sdp })
      );

      // ⭐ remoteDescription now set → flush queued candidates
      for (const c of candidateQueue.current) {
        try {
          await pc.addIceCandidate(c);
        } catch (err) {
          console.warn("flush candidate (answer) failed:", err);
        }
      }
      candidateQueue.current = [];

      setCallState("in-call");
    } catch (e) {
      console.error("handleAnswer", e);
    }
  };

  // ⭐ FIXED: robust candidate handling
  const handleCandidate = async (msg) => {
    const candidate = msg.candidate;
    if (!candidate) return;

    const pc = pcRef.current;

    // If PC not ready or remoteDescription not fully set → queue
    if (
      !pc ||
      !pc.remoteDescription ||
      !pc.remoteDescription.sdp
    ) {
      console.warn("⏳ Queuing ICE candidate, remoteDescription not ready");
      candidateQueue.current.push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(candidate);
    } catch (e) {
      console.warn("addIceCandidate error:", e);

      // If it's still a state error, queue again instead of dropping
      if (
        e.name === "InvalidStateError" ||
        (typeof e.message === "string" &&
          e.message.toLowerCase().includes("remote description"))
      ) {
        candidateQueue.current.push(candidate);
      }
    }
  };

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

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setMuted((x) => !x);
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setCameraOff((x) => !x);
  };

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
          console.warn("Unknown signal", signal);
      }
    },
  }));

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

  return (
    <div style={{ height: "100%", background: "#111", color: "#fff", padding: 10 }}>
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
            objectFit: "cover",
          }}
        />
      </div>

      <div style={{ marginTop: 15 }}>
        <div style={{ marginBottom: 8 }}>{statusText}</div>

        {callState === "idle" && (
          <button onClick={startCallAsCaller}>Call {targetUser}</button>
        )}

        {callState === "calling" && (
          <button onClick={() => hangup(true)}>Cancel</button>
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
