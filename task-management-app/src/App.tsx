import { Navigate, Outlet, useLocation } from "react-router";

import { useEffect, useMemo, useState } from "react";

import { Toaster } from 'react-hot-toast';

import { routepath } from "./Routes/route";

import { initForegroundPushListener, initPushIfAlreadyGranted, linkPushDeviceToUser } from "./utils/fcm";

import FloatingChat from "./Components/FloatingChat";

import ChatModal from "./Components/ChatModal";

import { chatService } from "./Services/Chat.service";

import toast from 'react-hot-toast';



export default function App() {



  const token = localStorage.getItem('token');

  const location = useLocation();

  const pathname = location?.pathname || '/';



  const [chatModalOpen, setChatModalOpen] = useState(false);

  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);

  const [chatInitialized, setChatInitialized] = useState(false);

  const [unreadByUserId, setUnreadByUserId] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('chat_unreadByUserId');
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });

  const [lastMessageAtByUserId, setLastMessageAtByUserId] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('chat_lastMessageAtByUserId');
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });





  // Initialize chat service when user is authenticated

  useEffect(() => {

    if (token && !chatInitialized) {

      chatService.initialize()

        .then(() => {

          setChatInitialized(true);

          console.log('✅ Chat service ready');

        })

        .catch((error) => {

          console.error('❌ Failed to initialize chat service:', error);

          toast.error('Failed to initialize chat service');

        });

    }

    if (!token && chatInitialized) {

      chatService.disconnect();

      setChatInitialized(false);

      localStorage.removeItem('chat_unreadByUserId');
      localStorage.removeItem('chat_lastMessageAtByUserId');
      setUnreadByUserId({});
      setLastMessageAtByUserId({});

    }

  }, [token, chatInitialized]);



  useEffect(() => {

    if (!token) return;

    try {
      localStorage.setItem('chat_unreadByUserId', JSON.stringify(unreadByUserId || {}));
    } catch {
      return;
    }

  }, [token, unreadByUserId]);



  useEffect(() => {

    if (!token) return;

    try {
      localStorage.setItem('chat_lastMessageAtByUserId', JSON.stringify(lastMessageAtByUserId || {}));
    } catch {
      return;
    }

  }, [token, lastMessageAtByUserId]);



  useEffect(() => {

    if (!chatInitialized) return;

    const handler = (data: any) => {

      console.log('Received chat list update:', data);

      const otherUserId = data?.otherUserId;
      if (!otherUserId) return;

      const ts = data?.lastMessageAt ? new Date(data.lastMessageAt).toISOString() : new Date().toISOString();

      setLastMessageAtByUserId((prev) => ({
        ...prev,
        [String(otherUserId)]: ts,
      }));

      const selectedId = selectedChatUser?.id || selectedChatUser?._id;
      const isChatOpenForThatUser = Boolean(chatModalOpen && selectedId && String(selectedId) === String(otherUserId));
      const inc = Number(data?.unreadIncrement || 0);

      if (!isChatOpenForThatUser && inc > 0) {
        setUnreadByUserId((prev) => ({
          ...prev,
          [String(otherUserId)]: (prev[String(otherUserId)] || 0) + inc,
        }));
      }

    };

    const unsubscribe = chatService.onChatListUpdate(handler);

    return () => {
      unsubscribe?.();
    };

  }, [chatInitialized, chatModalOpen, selectedChatUser]);



  useEffect(() => {

    if (!chatInitialized) return;

    const handler = (message: any) => {

      const me = chatService.getCurrentUser();
      const myId = me?.id || me?._id;
      if (!myId) return;

      const otherUserId = message?.senderId === myId ? message?.receiverId : message?.senderId;
      if (!otherUserId) return;

      if (message?.receiverId === myId) {
        const ts = message?.timestamp ? new Date(message.timestamp).toISOString() : new Date().toISOString();

        setLastMessageAtByUserId((prev) => ({
          ...prev,
          [String(otherUserId)]: ts,
        }));
      }

      const selectedId = selectedChatUser?.id || selectedChatUser?._id;
      const isChatOpenForThatUser = Boolean(chatModalOpen && selectedId && String(selectedId) === String(otherUserId));

      if (!isChatOpenForThatUser && message?.receiverId === myId) {
        const senderName = String(message?.senderName || 'Someone');
        const body = String(message?.content || 'New message');
        toast(`${senderName}: ${body}`);
      }

      if (isChatOpenForThatUser) {
        setUnreadByUserId((prev) => ({
          ...prev,
          [String(otherUserId)]: 0,
        }));
      }

    };

    const unsubscribe = chatService.onNewMessage(handler);

    return () => {
      unsubscribe?.();
    };

  }, [chatInitialized, chatModalOpen, selectedChatUser]);



  const handleUserSelect = (user: any) => {

    console.log('Selected user for chat:', user);

    setSelectedChatUser(user);

    setChatModalOpen(true);

    const uid = user?.id || user?._id;
    if (uid) {
      setUnreadByUserId((prev) => ({
        ...prev,
        [String(uid)]: 0,
      }));
    }

  };



  const handleCloseChatModal = () => {

    setChatModalOpen(false);

    setSelectedChatUser(null);

  };



  useEffect(() => {

    void initPushIfAlreadyGranted();

    void initForegroundPushListener();

  }, []);



  useEffect(() => {

    if (!token) return;

    void linkPushDeviceToUser({});

  }, [token]);



  const publicAuthPaths = useMemo(() => {

    return new Set<string>([

      '/',

      routepath.privacyPolicy,

      routepath.termsAndConditions,

      routepath.login,

      routepath.forgetPassword,

      routepath.verifyOtp,

      routepath.changePassword,

    ]);

  }, []);



  const isPublicAuthPath = publicAuthPaths.has(pathname);



  if (!token && !isPublicAuthPath) {

    return <Navigate to={routepath.login} replace />;

  }



  const authOnlyPaths = useMemo(() => {

    return new Set<string>([

      routepath.login,

      routepath.forgetPassword,

      routepath.verifyOtp,

      routepath.changePassword,

    ]);

  }, []);



  const isAuthOnlyPath = authOnlyPaths.has(pathname);



  if (token && isAuthOnlyPath) {

    return <Navigate to={routepath.dashboard} replace />;

  }



  return (

    <>

      <Toaster position="top-right" reverseOrder={false} />

      <Outlet />

      {token && <FloatingChat

        position="bottom-right"

        primaryColor="#10B982"

        onUserSelect={handleUserSelect}

        unreadCounts={unreadByUserId}

        lastMessageAt={lastMessageAtByUserId}

      />}

      {token && chatInitialized && <ChatModal

        isOpen={chatModalOpen}

        onClose={handleCloseChatModal}

        selectedUser={selectedChatUser}

      />}

    </>

  );

}