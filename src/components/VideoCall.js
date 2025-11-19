import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle
} from "react";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
];

const VideoCall = forwardRef(({ currentUser, targetUser, onClose }, ref) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const candidateQueue = useRef([]);

  const [callState, setCallState] = useState("idle"); 
  // idle, calling, ringing, in-call

  const sendSignal = (msg) => {
    if (window.stompClient?.connected) {
      window.stompClient.send("/app/call", {}, JSON.stringify(msg));
    }
  };

  const startLocalStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    localStreamRef.current = stream;
    localVideoRef.current.srcObject = stream;
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
      remoteVideoRef.current.srcObject = event.streams[0];
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pcRef.current = pc;

    // Add queued ICE candidates
    candidateQueue.current.forEach((c) => pc.addIceCandidate(c));
    candidateQueue.current = [];

    return pc;
  };

  /* OUTGOING CALL */
  const startCallAsCaller = async () => {
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
  };

  /* INCOMING OFFER */
  const handleOffer = async (msg) => {
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
  };

  /* INCOMING ANSWER */
  const handleAnswer = async (msg) => {
    if (!pcRef.current) return;
    await pcRef.current.setRemoteDescription({
      type: "answer",
      sdp: msg.sdp
    });
    setCallState("in-call");
  };

  /* INCOMING ICE CANDIDATE */
  const handleCandidate = async (msg) => {
    if (!msg.candidate) return;

    if (!pcRef.current) {
      candidateQueue.current.push(msg.candidate);
      return;
    }

    await pcRef.current.addIceCandidate(msg.candidate);
  };

  /* HANGUP */
  const hangup = (notify = true) => {
    pcRef.current?.close();
    pcRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    if (notify) {
      sendSignal({
        type: "hangup",
        from: currentUser.username,
        to: targetUser,
      });
    }

    setCallState("idle");
    onClose?.();
  };

  /* This exposes methods to App.js */
  useImperativeHandle(ref, () => ({
    handleSignal(signal) {
      switch (signal.type) {
        case "offer":
          handleOffer(signal);
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
      }
    },
  }));

  return (
    <div style={{ height: "100%", padding: "10px", background: "#111" }}>
      <div style={{ display: "flex", height: "80%" }}>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          style={{ width: "180px", height: "140px", background: "#222" }}
        />
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{ flex: 1, background: "black", marginLeft: 10 }}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        {callState === "idle" && (
          <button onClick={startCallAsCaller}>Call {targetUser}</button>
        )}
        {callState === "calling" && <span>📞 Calling...</span>}
        {callState === "ringing" && <span>📳 Incoming call...</span>}
        {callState === "in-call" && (
          <button onClick={() => hangup(true)}>Hang Up</button>
        )}
      </div>
    </div>
  );
});

export default VideoCall;
