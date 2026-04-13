import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import '../css/chat.css';
import { ArrowLeft, Send, Loader } from 'lucide-react';

export default function Chat() {
  const navigate = useNavigate();
  const { listingId, receiverId } = useParams();
  const messagesEndRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [receiverData, setReceiverData] = useState(null);
  const [listingData, setListingData] = useState(null);

  // ==========================================
  // 1. OBTER USUÁRIO AUTENTICADO
  // ==========================================
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          navigate('/login');
          return;
        }

        setCurrentUser(user);
      } catch (err) {
        console.error('Erro ao obter usuário:', err);
        navigate('/login');
      }
    };

    getCurrentUser();
  }, [navigate]);

  // ==========================================
  // 2. CARREGAR HISTÓRICO DE CONVERSAS E NOVOS CHATS
  // ==========================================
  const loadConversations = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(
          `
          *,
          sender:sender_id(id, full_name, avatar_url),
          receiver:receiver_id(id, full_name, avatar_url),
          listing:listing_id(id, title)
        `
        )
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar mensagens:', error);
        return;
      }

      const conversationMap = new Map();

      if (data && Array.isArray(data)) {
        data.forEach((msg) => {
          const otherUserId =
            msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
          const otherUser =
            msg.sender_id === userId ? msg.receiver : msg.sender;
          const key = `${msg.listing_id}-${otherUserId}`;

          if (!conversationMap.has(key)) {
            conversationMap.set(key, {
              listing_id: msg.listing_id,
              listing_title: msg.listing?.title || 'Sem título',
              other_user_id: otherUserId,
              other_user: otherUser,
              last_message: msg.content,
              last_message_time: msg.created_at,
              last_message_sender: msg.sender_id,
            });
          }
        });
      }

      const conversationsList = Array.from(conversationMap.values()).sort(
        (a, b) => new Date(b.last_message_time) - new Date(a.last_message_time)
      );

      // Tratamento para "Primeiro Contato"
      if (listingId && receiverId && !selectedConversation) {
        const convo = conversationsList.find(
          (c) => c.listing_id === listingId && c.other_user_id === receiverId
        );
        
        if (convo) {
          setConversations(conversationsList);
          setSelectedConversation(convo);
        } else {
          const [listingRes, receiverRes] = await Promise.all([
            supabase.from('listings').select('title').eq('id', listingId).single(),
            supabase.from('profiles').select('id, full_name, avatar_url').eq('id', receiverId).single()
          ]);

          if (!listingRes.error && !receiverRes.error) {
            const newConvo = {
              listing_id: listingId,
              listing_title: listingRes.data.title,
              other_user_id: receiverId,
              other_user: receiverRes.data,
              last_message: 'Inicie a conversa...',
              last_message_time: new Date().toISOString(),
              last_message_sender: null,
            };
            
            setConversations([newConvo, ...conversationsList]);
            setSelectedConversation(newConvo);
          } else {
            setConversations(conversationsList);
          }
        }
      } else {
        setConversations(conversationsList);
      }
    } catch (err) {
      console.error('Erro ao processar conversas:', err);
    }
  }, [listingId, receiverId, selectedConversation]);

  // ==========================================
  // 3. CARREGAR MENSAGENS E MARCAR COMO LIDAS
  // ==========================================
  const loadMessages = useCallback(
    async (conversation) => {
      if (!conversation || !currentUser) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('messages')
          .select(
            `
            *,
            sender:sender_id(id, full_name, avatar_url),
            receiver:receiver_id(id, full_name, avatar_url)
          `
          )
          .eq('listing_id', conversation.listing_id)
          .or(
            `and(sender_id.eq.${currentUser.id},receiver_id.eq.${conversation.other_user_id}),and(sender_id.eq.${conversation.other_user_id},receiver_id.eq.${currentUser.id})`
          )
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Erro ao carregar mensagens:', error);
          return;
        }

        setMessages(data || []);
        setReceiverData(conversation.other_user);
        setListingData({ id: conversation.listing_id, title: conversation.listing_title });
        setLoading(false);

        // MARCAR COMO LIDAS!
        // Pega os IDs de todas as mensagens onde o usuário logado é o recebedor e ainda estão como não lidas
        const unreadIds = data
          ?.filter(m => m.receiver_id === currentUser.id && m.is_read === false)
          .map(m => m.id) || [];
          
        if (unreadIds.length > 0) {
          await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
        }

      } catch (err) {
        console.error('Erro ao processar mensagens:', err);
        setLoading(false);
      }
    },
    [currentUser]
  );

  // ==========================================
  // 4. EFEITO: CARREGAR CONVERSAS
  // ==========================================
  useEffect(() => {
    if (currentUser) {
      loadConversations(currentUser.id);
    }
  }, [currentUser, loadConversations]);

  // ==========================================
  // 5. EFEITO: CARREGAR MENSAGENS E LIMPAR INPUT
  // ==========================================
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      setMessageInput('');
    }
  }, [selectedConversation, loadMessages]);

  // ==========================================
  // 6. SCROLL AUTOMÁTICO PARA FINAL
  // ==========================================
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ==========================================
  // 7. SUPABASE REALTIME: ESCUTAR NOVAS MENSAGENS
  // ==========================================
  useEffect(() => {
    if (!currentUser || !selectedConversation) return;

    const channel = supabase
      .channel(
        `messages-${selectedConversation.listing_id}-${currentUser.id}-${selectedConversation.other_user_id}`
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `listing_id=eq.${selectedConversation.listing_id}`,
        },
        (payload) => {
          const msg = payload.new;
          if (
            (msg.sender_id === currentUser.id &&
              msg.receiver_id === selectedConversation.other_user_id) ||
            (msg.sender_id === selectedConversation.other_user_id &&
              msg.receiver_id === currentUser.id)
          ) {
            supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', msg.sender_id)
              .single()
              .then(({ data: senderData }) => {
                setMessages((prev) => {
                  // Previne clonagem na UI
                  if (prev.some(m => m.id === msg.id)) return prev;
                  return [
                    ...prev,
                    { ...msg, sender: senderData, receiver: receiverData },
                  ];
                });

                // Se eu estiver com o chat aberto e a mensagem for pra mim, já marca como lida
                if (msg.receiver_id === currentUser.id) {
                  supabase.from('messages').update({ is_read: true }).eq('id', msg.id).then();
                }
              });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentUser, selectedConversation, receiverData]);

  // ==========================================
  // 8. FUNÇÃO: ENVIAR MENSAGEM INSTANTÂNEA
  // ==========================================
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!messageInput.trim() || !selectedConversation || !currentUser) return;

    try {
      setSending(true);

      // Insere e já pede o retorno imediato da mensagem completa com os dados dos usuários
      const { data: newMsg, error } = await supabase.from('messages').insert([
        {
          listing_id: selectedConversation.listing_id,
          sender_id: currentUser.id,
          receiver_id: selectedConversation.other_user_id,
          content: messageInput.trim(),
        },
      ]).select(`*, sender:sender_id(id, full_name, avatar_url), receiver:receiver_id(id, full_name, avatar_url)`).single();

      if (error) throw error;

      setMessageInput('');
      
      // Joga a mensagem na tela na mesma hora
      setMessages((prev) => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      
    } catch (err) {
      console.error('Erro ao processar envio:', err);
      alert('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  // ==========================================
  // 9. FORMATAÇÃO DE DATA/HORA
  // ==========================================
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  if (!currentUser) {
    return (
      <div className="chat-page">
        <div className="chat-loading">
          <Loader className="loader-icon" />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      {/* PAINEL ESQUERDO: LISTA DE CONVERSAS */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2>Mensagens</h2>
          <button
            className="chat-back-btn"
            onClick={() => navigate('/')}
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        <div className="chat-conversations-list">
          {conversations.length === 0 ? (
            <div className="chat-empty-state">
              <p>Nenhuma conversa ainda</p>
              <small>Comece uma conversa a partir de um anúncio!</small>
            </div>
          ) : (
            conversations.map((conversation, index) => (
              <div
                key={index}
                className={`chat-conversation-item ${
                  selectedConversation === conversation ? 'active' : ''
                }`}
                onClick={() => setSelectedConversation(conversation)}
              >
                <div className="chat-conversation-avatar">
                  {conversation.other_user?.avatar_url ? (
                    <img
                      src={conversation.other_user.avatar_url}
                      alt={conversation.other_user.full_name}
                    />
                  ) : (
                    <div className="chat-avatar-placeholder">
                      {conversation.other_user?.full_name
                        ?.charAt(0)
                        .toUpperCase() || '?'}
                    </div>
                  )}
                </div>

                <div className="chat-conversation-info">
                  <div className="chat-conversation-header">
                    <h4>{conversation.other_user?.full_name || 'Usuário'}</h4>
                    <span className="chat-time">
                      {formatTime(conversation.last_message_time)}
                    </span>
                  </div>
                  <p className="chat-conversation-title">
                    📌 {conversation.listing_title}
                  </p>
                  <p className="chat-conversation-last-msg">
                    {conversation.last_message_sender === currentUser.id
                      ? 'Você: '
                      : ''}{' '}
                    {conversation.last_message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PAINEL DIREITO: ÁREA DE MENSAGENS */}
      <div className="chat-main">
        {!selectedConversation ? (
          <div className="chat-no-selection">
            <p>Selecione uma conversa para começar</p>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div className="chat-header">
              <div className="chat-header-info">
                <h3>{receiverData?.full_name || 'Usuário'}</h3>
                <p>📌 {listingData?.title}</p>
              </div>
            </div>

            {/* ÁREA DE MENSAGENS */}
            <div className="chat-messages">
              {loading ? (
                <div className="chat-loading">
                  <Loader className="loader-icon loader-icon-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="chat-empty-messages">
                  <p>Nenhuma mensagem ainda</p>
                  <small>Comece a conversa! Envie o primeiro "Olá".</small>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = message.sender_id === currentUser.id;
                  const showDate =
                    index === 0 ||
                    formatDate(messages[index - 1].created_at) !==
                      formatDate(message.created_at);

                  return (
                    <div key={message.id}>
                      {showDate && (
                        <div className="chat-date-separator">
                          {formatDate(message.created_at)}
                        </div>
                      )}
                      <div
                        className={`chat-message ${
                          isOwn ? 'own' : 'other'
                        }`}
                      >
                        <div className="chat-message-bubble">
                          <p>{message.content}</p>
                          <span className="chat-message-time">
                            {formatTime(message.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* INPUT DE MENSAGEM */}
            <form className="chat-input-area" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="chat-input"
                placeholder="Digite uma mensagem..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                disabled={sending}
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={sending || !messageInput.trim()}
                title={sending ? 'Enviando...' : 'Enviar'}
              >
                {sending ? (
                  <Loader size={20} className="loader-icon-spin" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}