let APP_ID = "248f279a9990461e87c90a071fce1fbb";

let token = null;

let uid = String(Math.floor(Math.random() * 10000));

let client;
let channel;

let queryString = window.location.search
let urlParams = new URLSearchParams(queryString)
let roomID = urlParams.get('room')


if(!roomID){
    window.location = 'lobby.html'
}


let localstream;
let remotestream;
let peerconnection;

const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
};


let constrains = {
    video:{
        width:{min:640 , ideal:1920 , max:1920},
        height:{min:480 , ideal:1080 ,max:1080},
    },
    audio : true}


let init = async () => {
    try {
        client = await AgoraRTM.createInstance(APP_ID);
        await client.login({ uid, token });
        
        channel = client.createChannel(roomID);
        await channel.join();

        channel.on('MemberJoined', handleUserJoined);
        client.on('MessageFromPeer', handleMessageFromPeer);
        channel.on('memberLeft', handleUserLeft); // Corrected event listener

        localstream = await navigator.mediaDevices.getUserMedia({constrains});
        document.getElementById('user-1').srcObject = localstream;
    } 
    catch (error) {
        console.error("Initialization error:", error);
    }
};



let handleUserLeft = (MemberId) => {
   
    document.getElementById('user-2').style.display = 'none';
    document.getElementById('user-1').classList.remove('smallframe')

}




let handleMessageFromPeer = async (message, MemberId) => {
    message = JSON.parse(message.text);

    if (message.type == 'offer') {
        createAnswer(MemberId, message.offer);
    } else if (message.type == 'answer') {
        addAnswer(message.answer);
    } else if (message.type == 'candidate') {
        if (peerconnection && peerconnection.localDescription) {
            peerconnection.addIceCandidate(message.candidate);
        }
    }
};

let handleUserJoined = async (MemberId) => {
    console.log('A user has joined the channel:', MemberId);
    createOffer(MemberId);
};

let createPeerConnection = async (MemberId) => {
    peerconnection = new RTCPeerConnection(servers);

    remotestream = new MediaStream();
    document.getElementById('user-2').srcObject = remotestream;
    document.getElementById('user-2').style.display = 'block'

    document.getElementById('user-1').classList.add('smallframe')




    if (!localstream) {
        localstream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('user-1').srcObject = localstream;
    }

    localstream.getTracks().forEach((track) => {
        peerconnection.addTrack(track, localstream);
    });

    peerconnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remotestream.addTrack(track);
        });
    };

    peerconnection.onicecandidate = async (event) => {
        if (event.candidate) {
            client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'candidate', 'candidate': event.candidate }) }, MemberId);
        }
    };
};

let createOffer = async (MemberId) => {
    await createPeerConnection(MemberId);

    try {
        let offer = await peerconnection.createOffer();
        await peerconnection.setLocalDescription(offer);

        client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'offer', 'offer': offer }) }, MemberId);
    } catch (error) {
        console.error("Error creating offer:", error);
    }
};

let createAnswer = async (MemberId, offer) => {
    await createPeerConnection(MemberId);

    try {
        await peerconnection.setRemoteDescription(offer);

        let answer = await peerconnection.createAnswer();
        await peerconnection.setLocalDescription(answer);

        client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'answer', 'answer': answer }) }, MemberId);
    } catch (error) {
        console.error("Error creating answer:", error);
    }
};

let addAnswer = async (answer) => {
    if (!peerconnection.currentRemoteDescription) {
        try {
            await peerconnection.setRemoteDescription(answer);
        } catch (error) {
            console.error("Error setting remote description:", error);
        }
    }
};


let leaveChannel = async () => {
    try {
        
        if (peerconnection) {
            peerconnection.close();
        }

        // Leave the channel and logout
         channel.leave();

         client.logout();
    } catch (error) {
        console.error("Error leaving channel:", error);
    }
};


let toggleCamera = async () => {
    let videoTrack = localstream.getTracks().find(track => track.kind === 'video')

    if(videoTrack.enabled){
        videoTrack.enabled = false
        document.getElementById('camera-btn').style.color = 'tomato';
    }
    else{
        videoTrack.enabled = true
        document.getElementById('camera-btn').style.color = 'white';
    }
}

let toggleMic = async () => {
    let audioTrack = localstream.getTracks().find(track => track.kind === 'audio')

    if(audioTrack.enabled){
        audioTrack.enabled = false
        document.getElementById('mic-btn').style.color = 'tomato';
    }
    else{
        audioTrack.enabled = true
        document.getElementById('mic-btn').style.color = 'white';
    }
}


window.addEventListener('beforeunload' , leaveChannel)

document.getElementById('camera-btn').addEventListener('click' , toggleCamera)
document.getElementById('mic-btn').addEventListener('click' , toggleMic)

init();
