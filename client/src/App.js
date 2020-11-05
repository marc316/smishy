import React, { useEffect, useState, useRef, Suspense } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";

import Navigation from "./Components/Navigation/Navigation";
import Footer from "./Components/Footer/Footer";
import Chat from "./Components/Chat/Chat";

import camera from "./Icons/camera.svg";
import camerastop from "./Icons/camera-stop.svg";
import microphone from "./Icons/microphone.svg";
import microphonestop from "./Icons/microphone-stop.svg";
import share from "./Icons/share.svg";
import hangup from "./Icons/hang-up.svg";
import fullscreen from "./Icons/fullscreen.svg";
import minimize from "./Icons/minimize.svg";

const _ = require("lodash");

const Watermark = React.lazy(() => import("./Components/Watermark/Watermark"));

function App() {
  const [yourID, setYourID] = useState("");
  const [users, setUsers] = useState([]);
  const [stream, setStream] = useState();
  const [partner, setPartner] = useState("");
  const [searchingPartner, setSearchingPartner] = useState(false);
  const [chatOnline, setChatOnline] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [isfullscreen, setFullscreen] = useState(false);
  const [nextDisabled, setNextDisabled] = useState(true);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState([
    { type: "system", text: "Please stay nice!" },
  ]);

  const userVideo = useRef();
  const partnerVideo = useRef();
  const socket = useRef();
  const myPeer = useRef();

  useEffect(() => {
    initVideo();
    socket.current = io.connect("/");

    socket.current.on("yourID", (id) => {
      setYourID(id);
    });

    socket.current.on("allUsers", (users) => {
      setUsers(users);
    });

    socket.current.on("messageSent", (data) => {
      setMessages((m) => [...m, { type: "you", text: data.message }]);
    });

    socket.current.on("receiveMessage", (data) => {
      setMessages((m) => [...m, { type: "partner", text: data.message }]);
    });

    socket.current.on("peer", (data) => {
      socket.current.off("signal");

      setPartner(data.peerId);

      let peerId = data.peerId;
      let peer = new Peer({
        initiator: data.initiator,
        trickle: true,
        config: {
          iceServers: [
            {
              urls: "stun:numb.viagenie.ca",
              username: "sultan1640@gmail.com",
              credential: "98376683",
            },
            {
              urls: "turn:numb.viagenie.ca",
              username: "sultan1640@gmail.com",
              credential: "98376683",
            },
          ],
        },
        stream: userVideo.current.srcObject,
      });

      // peer._debug = console.log;

      myPeer.current = peer;

      socket.current.on("signal", (data) => {
        if (data.peerId === peerId) {
          peer.signal(data.signal);
        }
      });

      // socket.current.on("close", () => {
      //   setChatOnline(false);
      //   myPeer.current.destroy();
      // });

      peer.on("signal", (data) => {
        socket.current.emit("signal", {
          signal: data,
          peerId: peerId,
        });
      });

      peer.on("error", (e) => { });

      peer.on("connect", () => {
        peer.send("hey peer");
      });

      peer.on("data", (data) => { });

      peer.on("stream", (stream) => {
        setChatOnline(true);
        setSearchingPartner(false);
        partnerVideo.current.srcObject = stream;
      });

      peer.on("close", () => {
        setChatOnline(false);
        setMessages([{ type: "system", text: "Please stay nice!" }]);
      });
    });
  }, []);

  function initVideo() {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        setNextDisabled(false);
        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }
      });
  }

  function next() {
    setSearchingPartner(true);
    socket.current.emit("findPartner", {
      from: yourID,
    });
  }

  function sendMessage(e) {
    e.preventDefault();
    if (inputText !== "") {
      socket.current.emit("sendMessage", {
        message: inputText,
        peerId: partner,
      });
    }
    setInputText("");
  }

  function cancel() {
    setSearchingPartner(false);
    socket.current.emit("leaveQueue");
  }

  function endCall() {
    myPeer.current.destroy();
    setChatOnline(false);
    setMessages([{ type: "system", text: "Please stay nice!" }]);
  }

  function shareScreen() {
    navigator.mediaDevices
      .getDisplayMedia({ cursor: true })
      .then((screenStream) => {
        setStream(screenStream);
        myPeer.current.replaceTrack(
          stream.getVideoTracks()[0],
          screenStream.getVideoTracks()[0],
          stream
        );
        userVideo.current.srcObject = screenStream;
        screenStream.getTracks()[0].onended = () => {
          setStream(stream);
          myPeer.current.replaceTrack(
            screenStream.getVideoTracks()[0],
            stream.getVideoTracks()[0],
            stream
          );
          userVideo.current.srcObject = stream;
        };
      });
  }

  function toggleMuteAudio() {
    if (stream) {
      setAudioMuted(!audioMuted);
      stream.getAudioTracks()[0].enabled = audioMuted;
    }
  }

  function toggleMuteVideo() {
    if (stream) {
      setVideoMuted(!videoMuted);
      stream.getVideoTracks()[0].enabled = videoMuted;
    }
  }

  function isMobileDevice() {
    let check = false;
    (function (a) {
      if (
        // eslint-disable-next-line
        /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
          a
        ) ||
        // eslint-disable-next-line
        /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
          a.substr(0, 4)
        )
      )
        check = true;
    })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
  }

  let UserVideo;
  if (stream) {
    UserVideo = (
      <video className="video userVideo" playsInline muted ref={userVideo} autoPlay />
    );
  }

  let PartnerVideo;
  if (chatOnline && isfullscreen) {
    PartnerVideo = (
      <video className="video partnerVideo" playsInline ref={partnerVideo} autoPlay />
    );
  } else if (chatOnline && !isfullscreen) {
    PartnerVideo = (
      <video className="video partnerVideo" playsInline ref={partnerVideo} autoPlay />
    );
  }

  let audioControl;
  let videoControl;
  let fullscreenButton;
  let screenShare;
  let hangUp;
  if (chatOnline) {
    if (audioMuted) {
      audioControl = (
        <span className="iconContainer" onClick={() => toggleMuteAudio()}>
          <img src={microphonestop} alt="Unmute audio" />
        </span>
      );
    } else {
      audioControl = (
        <span className="iconContainer" onClick={() => toggleMuteAudio()}>
          <img src={microphone} alt="Mute audio" />
        </span>
      );
    }

    if (videoMuted) {
      videoControl = (
        <span className="iconContainer" onClick={() => toggleMuteVideo()}>
          <img src={camerastop} alt="Resume video" />
        </span>
      );
    } else {
      videoControl = (
        <span className="iconContainer" onClick={() => toggleMuteVideo()}>
          <img src={camera} alt="Stop audio" />
        </span>
      );
    }

    screenShare = (
      <span className="iconContainer" onClick={() => shareScreen()}>
        <img src={share} alt="Share screen" />
      </span>
    );
    if (isMobileDevice()) {
      screenShare = <></>;
    }

    hangUp = (
      <span className="iconContainer" onClick={() => endCall()}>
        <img src={hangup} alt="End call" />
      </span>
    );

    if (isfullscreen) {
      fullscreenButton = (
        <span
          className="iconContainer"
          onClick={() => {
            setFullscreen(false);
          }}
        >
          <img src={minimize} alt="fullscreen" />
        </span>
      );
    } else {
      fullscreenButton = (
        <span
          className="iconContainer"
          onClick={() => {
            setFullscreen(true);
          }}
        >
          <img src={fullscreen} alt="fullscreen" />
        </span>
      );
    }
  }

  let landingHTML = (
    <>
      <Navigation online={users.length} />
      <main>
        <div className="mainContainer">
          {chatOnline && (
            <div className="chatContainer">
              <Chat messages={messages} />
              <div className="inputBox">
                <form onSubmit={(e) => sendMessage(e)}>
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                  <input type="submit" value="Send" />
                </form>
              </div>
            </div>
          )}
          {!chatOnline && (
            <div className="welcomeContainer">
              <div className="welcomeText flex flex-center">Chat with strangers</div>
              <div className="descriptionText flex flex-center">across the world for free</div>
              {nextDisabled && (
                <div className="descriptionText flex flex-center">
                  please enable your camera and microphone then refresh the page
                </div>
              )}
              <div className="callBox flex flex-center">
                {!searchingPartner && !nextDisabled && (
                  <button onClick={() => next()} className="primaryButton next">
                    Next
                  </button>
                )}
                {searchingPartner && !nextDisabled && (
                  <button onClick={() => cancel()} className="primaryButton cancel">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );

  return (
    <>
      <span className="callContainer">
        <Suspense fallback={<div>Loading...</div>}>
          <Watermark />
        </Suspense>
        <div className="videoContainer partnerVideoContainer">{PartnerVideo}</div>
        <div className="videoContainer userVideoContainer">{UserVideo}</div>
        <div className="controlsContainer flex">
          {audioControl}
          {videoControl}
          {screenShare}
          {fullscreenButton}
          {hangUp}
        </div>
      </span>
      <span>{landingHTML}</span>
    </>
  );
}

export default App;
