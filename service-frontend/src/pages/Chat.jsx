import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ArrowLeft, Send, Loader, ChevronRight, MessageCircle } from 'lucide-react';
import '../css/global.css';

export default function Chat() {
  const navigate = useNavigate();
  const { listingId, receiverId } = useParams();
  const messagesEndRef = useRef(null);
  
  // Ref de segurança para impedir loop infinito ao carregar chat via URL
  const handledUrlParams = useRef(false);

  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [receiverData, setReceiverData] = useState(null);
  const [listingData, setListingData] = useState(null);

  // ==========================================
  // 1. OBTER USUÁRIO (BLINDADO CONTRA ERROS)
  // ==========================================
  useEffect(() => {
    let isMounted = true;
    const getCurrentUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          if (isMounted) navigate('/login');
          return;
        }
        if (isMounted) setCurrentUser(user);
      } catch (err) {
        console.error('Erro ao obter usuário:', err);
        if (isMounted) navigate('/login');
      }
    };
    getCurrentUser();
    return () => { isMounted = false; };
  }, [navigate]);

  // ==========================================
  // 2. CARREGAR HISTÓRICO DE CONVERSAS
  // ==========================================
  const loadConversations = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(id, full_name, avatar_url),
          receiver:receiver_id(id, full_name, avatar_url),
          listing:listing_id(id, title)
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const conversationMap = new Map();

      if (data && Array.isArray(data)) {
        data.forEach((msg) => {
          const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
          const otherUser = msg.sender_id === userId ? msg.receiver : msg.sender;
          const key = `${msg.listing_id}-${otherUserId}`;

          if (!conversationMap.has(key)) {
            conversationMap.set(key, {
              listing_id: msg.listing_id,
              listing_title: msg.listing?.title || 'Anúncio sem título',
              other_user_id: otherUserId,
              other_user: otherUser || { full_name: 'Usuário', avatar_url: null },
              last_message_time: msg.created_at,
            });
          }
        });
      }

      const conversationsList = Array.from(conversationMap.values()).sort(
        (a, b) => new Date(b.last_message_time) - new Date(a.last_message_time)
      );

      // Tratamento Seguro de Abertura de Chat via Link
      if (listingId && receiverId && !handledUrlParams.current) {
        handledUrlParams.current = true; 
        
        const convo = conversationsList.find(c => String(c.listing_id) === String(listingId) && String(c.other_user_id) === String(receiverId));
        
        if (convo) {
          setConversations(conversationsList);
          setSelectedConversation(convo);
        } else {
          try {
            const [listingRes, receiverRes] = await Promise.all([
              supabase.from('listings').select('title').eq('id', listingId).single(),
              supabase.from('profiles').select('id, full_name, avatar_url').eq('id', receiverId).single()
            ]);

            const newConvo = {
              listing_id: listingId,
              listing_title: listingRes.data?.title || 'Anúncio indisponível',
              other_user_id: receiverId,
              other_user: receiverRes.data || { full_name: 'Usuário', avatar_url: null },
              last_message_time: new Date().toISOString(),
            };
            
            setConversations([newConvo, ...conversationsList]);
            setSelectedConversation(newConvo);
          } catch (err) {
            console.error('Erro ao buscar dados da nova conversa:', err);
            setConversations(conversationsList);
          }
        }
      } else {
        setConversations(conversationsList);
      }
    } catch (err) {
      console.error('Erro ao processar conversas:', err);
    }
  }, [listingId, receiverId]);

  // ==========================================
  // 3. CARREGAR MENSAGENS E MARCAR LIDAS
  // ==========================================
  const loadMessages = useCallback(async (conversation) => {
    if (!conversation || !currentUser) return;

    let isMounted = true;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select(`*, sender:sender_id(id, full_name, avatar_url), receiver:receiver_id(id, full_name, avatar_url)`)
        .eq('listing_id', conversation.listing_id)
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${conversation.other_user_id}),and(sender_id.eq.${conversation.other_user_id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (isMounted) {
        setMessages(data || []);
        setReceiverData(conversation.other_user);
        setListingData({ id: conversation.listing_id, title: conversation.listing_title });
        
        const unreadIds = data?.filter(m => m.receiver_id === currentUser.id && m.is_read === false).map(m => m.id) || [];
        if (unreadIds.length > 0) {
          supabase.from('messages').update({ is_read: true }).in('id', unreadIds).then();
        }
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    } finally {
      if (isMounted) setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      let isMounted = true;
      const loadConvAsync = async () => {
        if (isMounted) await loadConversations(currentUser.id);
      };
      loadConvAsync();
      return () => { isMounted = false; };
    }
  }, [currentUser, loadConversations]);

  const [activeOrder, setActiveOrder] = useState(null);

  const fetchActiveOrder = useCallback(async (conversation) => {
    if (!currentUser || !conversation) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('listing_id', conversation.listing_id)
        .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        setActiveOrder(data[0]);
      } else {
        setActiveOrder(null);
      }
    } catch (err) {
      console.error('Erro ao buscar pedido ativo:', err);
    }
  }, [currentUser]);

  const handleConfirmReceipt = async (pedidoId) => {
    if (!selectedConversation || !currentUser) return;
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', pedidoId);

      if (!error) {
        setActiveOrder(prev => prev && prev.id === pedidoId ? { ...prev, status: 'completed' } : prev);
        
        // Envia mensagem automática informando a conclusão
        await supabase.from('messages').insert([{
          listing_id: selectedConversation.listing_id,
          sender_id: currentUser.id,
          receiver_id: selectedConversation.other_user_id,
          content: '✔️ Confirmei o recebimento do produto/serviço! O pagamento foi liberado.',
        }]);
      } else {
        throw error;
      }
    } catch (err) {
      console.error('Erro ao confirmar recebimento:', err);
      alert('Erro ao confirmar o recebimento.');
    }
  };

  useEffect(() => {
    if (selectedConversation) {
      let isMounted = true;
      const loadMsgAsync = async () => {
        if (isMounted) {
          await loadMessages(selectedConversation);
          await fetchActiveOrder(selectedConversation);
        }
      };
      loadMsgAsync();
      setMessageInput('');
      return () => { isMounted = false; };
    }
  }, [selectedConversation, loadMessages, fetchActiveOrder]);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView();
  }, [messages]);

  // ==========================================
  // 4. SUPABASE REALTIME
  // ==========================================
  useEffect(() => {
    if (!currentUser || !selectedConversation) return;

    let isMounted = true;
    const channelName = `room-${selectedConversation.listing_id}-${currentUser.id}-${selectedConversation.other_user_id}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `listing_id=eq.${selectedConversation.listing_id}` },
        (payload) => {
          const msg = payload.new;
          if (
            (msg.sender_id === currentUser.id && msg.receiver_id === selectedConversation.other_user_id) ||
            (msg.sender_id === selectedConversation.other_user_id && msg.receiver_id === currentUser.id)
          ) {
            supabase.from('profiles').select('id, full_name, avatar_url').eq('id', msg.sender_id).single()
              .then(({ data: senderData }) => {
                if (isMounted) {
                  setMessages((prev) => {
                    if (prev.some(m => m.id === msg.id)) return prev;
                    return [...prev, { ...msg, sender: senderData, receiver: receiverData }];
                  });
                  if (msg.receiver_id === currentUser.id) {
                    supabase.from('messages').update({ is_read: true }).eq('id', msg.id).then();
                  }
                }
              });
          }
        }
      ).subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [currentUser, selectedConversation, receiverData]);

  // ==========================================
  // 5. ENVIAR MENSAGEM
  // ==========================================
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation || !currentUser) return;

    try {
      setSending(true);
      const { data: newMsg, error } = await supabase.from('messages').insert([{
        listing_id: selectedConversation.listing_id,
        sender_id: currentUser.id,
        receiver_id: selectedConversation.other_user_id,
        content: messageInput.trim(),
      }]).select(`*, sender:sender_id(id, full_name, avatar_url), receiver:receiver_id(id, full_name, avatar_url)`).single();

      if (error) throw error;
      
      setMessageInput('');
      setMessages((prev) => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date)) return '';
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date)) return '';
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Hoje';
    if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
    return date.toLocaleDateString('pt-BR');
  };

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f0f2f5]">
        <Loader className="animate-spin text-[#0A847C] w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-[#f0f2f5] overflow-hidden font-sans">
      
      {/* =======================================
          PAINEL ESQUERDO: LISTA DE CONTATOS 
          ======================================= */}
      <div className={`w-full md:w-[350px] lg:w-[400px] flex-shrink-0 flex-col border-r border-slate-200 bg-white z-10 ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        
        <div className="h-16 px-4 bg-[#f0f2f5] flex items-center gap-3 shrink-0">
          <button onClick={() => navigate('/')} className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-full transition-colors" title="Voltar para Home">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-bold text-slate-800">Mensagens</h2>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide bg-white">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
              <span className="text-4xl mb-3">💬</span>
              <p className="font-medium">Nenhuma conversa</p>
            </div>
          ) : (
            conversations.map((conversation, index) => {
              const isSelected = selectedConversation?.listing_id === conversation.listing_id && selectedConversation?.other_user_id === conversation.other_user_id;
              
              return (
                <div
                  key={index}
                  className={`flex items-center gap-4 p-4 border-b border-slate-100 cursor-pointer transition-all ${
                    isSelected ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0">
                    {conversation.other_user?.avatar_url ? (
                      <img src={conversation.other_user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-slate-500 bg-slate-200">
                        {conversation.other_user?.full_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-[15px] truncate ${isSelected ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}`}>
                      {conversation.other_user?.full_name || 'Usuário'}
                    </h4>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* =======================================
          PAINEL DIREITO: CHAT E MENSAGENS 
          ======================================= */}
      <div className={`flex-1 flex-col bg-[#efeae2] h-[100dvh] ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        
        {!selectedConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 bg-[#f0f2f5]">
            <MessageCircle size={60} className="text-slate-300 mb-4" />
            <h3 className="text-xl font-medium">Seus Chats do ServiCE</h3>
            <p className="text-sm mt-2">Selecione uma conversa para começar a interagir.</p>
          </div>
        ) : (
          <>
            {/* CABEÇALHO DO CHAT */}
            <div className="h-[70px] bg-[#f0f2f5] px-4 py-2 flex items-center shrink-0 shadow-sm z-10 gap-2">
              <button className="md:hidden p-2 -ml-2 text-slate-600 rounded-full" onClick={() => setSelectedConversation(null)}>
                <ArrowLeft size={22} />
              </button>

              <div 
                className="flex flex-col cursor-pointer px-2 py-1 rounded-xl hover:bg-slate-200/50 transition-colors flex-1 min-w-0"
                onClick={() => navigate(`/detalhes/${selectedConversation.listing_id}`)}
                title="Ver anúncio"
              >
                <div className="flex items-center gap-1">
                  <h3 className="text-base font-bold text-slate-900 truncate">
                    {receiverData?.full_name || selectedConversation.other_user?.full_name || 'Usuário'}
                  </h3>
                  <ChevronRight size={16} className="text-slate-500 shrink-0" />
                </div>
                <p className="text-[13px] font-medium text-slate-600 flex items-center gap-1 truncate">
                  <span className="text-xs shrink-0">📌</span> 
                  <span className="truncate">{listingData?.title || selectedConversation.listing_title}</span>
                </p>
              </div>
            </div>

            {/* WIDGET DE STATUS DO PEDIDO (COMPRA GARANTIDA) */}
            {activeOrder && (
              <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10 animate-in slide-in-from-top duration-200">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100">
                    {activeOrder.status === 'pending' ? '⏳' : activeOrder.status === 'paid' ? '🔒' : activeOrder.status === 'completed' ? '✅' : '❌'}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Pedido #{activeOrder.id.slice(0, 8)}
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-slate-800">
                      {activeOrder.status === 'pending' && 'Aguardando pagamento.'}
                      {activeOrder.status === 'paid' && (
                        activeOrder.buyer_id === currentUser.id 
                          ? 'Pagamento seguro retido. Confirme se recebeu.' 
                          : 'Pagamento seguro retido. Entregue o serviço/produto.'
                      )}
                      {activeOrder.status === 'completed' && 'Negócio concluído! Dinheiro liberado.'}
                      {activeOrder.status === 'cancelled' && 'Pedido cancelado.'}
                    </p>
                  </div>
                </div>
                
                <div className="shrink-0">
                  {activeOrder.status === 'pending' && activeOrder.buyer_id === currentUser.id && (
                    <button 
                      onClick={() => navigate(`/checkout/${activeOrder.id}`)}
                      className="px-3 py-1.5 bg-[#00a884] hover:bg-[#008f6f] text-white text-xs font-bold rounded-lg active:scale-95 transition-all shadow-sm"
                    >
                      Pagar Agora
                    </button>
                  )}
                  {activeOrder.status === 'paid' && activeOrder.buyer_id === currentUser.id && (
                    <button 
                      onClick={() => handleConfirmReceipt(activeOrder.id)}
                      className="px-3 py-1.5 bg-[#0d6e56] hover:bg-[#0a4f3e] text-white text-xs font-bold rounded-lg active:scale-95 transition-all shadow-sm"
                    >
                      Confirmar Recebimento
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ÁREA DE MENSAGENS */}
            <div className="flex-1 overflow-y-auto px-4 py-6 md:px-10 flex flex-col">
              {loading ? (
                <div className="flex justify-center py-10">
                  <span className="bg-white/90 px-4 py-2 rounded-full text-sm text-slate-500 font-medium shadow-sm flex items-center gap-2">
                    <Loader className="animate-spin w-4 h-4" /> Carregando mensagens...
                  </span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center py-10">
                  <span className="bg-[#fff4c2] px-5 py-2.5 rounded-xl text-[13px] text-slate-700 font-medium shadow-sm text-center max-w-sm leading-relaxed">
                    As mensagens e chamadas são protegidas com a garantia ServiCE. Inicie a negociação.
                  </span>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = message.sender_id === currentUser.id;
                  const prevMsg = messages[index - 1];
                  const nextMsg = messages[index + 1];
                  const showDate = index === 0 || (prevMsg?.created_at && message?.created_at && formatDate(prevMsg.created_at) !== formatDate(message.created_at));

                  const sameAsPrev = !showDate && prevMsg && prevMsg.sender_id === message.sender_id;
                  const sameAsNext = nextMsg && nextMsg.sender_id === message.sender_id
                    && formatDate(nextMsg.created_at) === formatDate(message.created_at);

                  const ownCorner = sameAsNext ? 'rounded-br-md' : 'rounded-br-none';
                  const otherCorner = sameAsNext ? 'rounded-bl-md' : 'rounded-bl-none';

                  return (
                    <div key={message.id} className={`flex flex-col ${sameAsPrev ? 'mt-1' : 'mt-4'}`}>
                      
                      {/* SEPARADOR DE DATA - HARMONIZADO */}
                      {showDate && (
                        <div className="flex justify-center my-5">
                          <span className="bg-white/95 px-4 py-1.5 rounded-full shadow-sm text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                      )}

                      <div className={`flex w-full ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        
                        {/* BALÃO DA MENSAGEM COM ESPAÇO FANTASMA */}
                        <div
                          className={`relative w-fit max-w-[85%] sm:max-w-[75%] md:max-w-[65%] px-3 pt-2 pb-1.5 shadow-sm ${
                            isOwn
                              ? `bg-[#dcf8c6] text-slate-900 rounded-2xl ${ownCorner}`
                              : `bg-white text-slate-900 rounded-2xl ${otherCorner}`
                          }`}
                        >
                          <span className="text-[15px] leading-snug whitespace-pre-wrap break-words text-left">
                            {message.content}
                            {/* O bloco que impede o texto de encostar na hora */}
                            <span className="inline-block w-12">&#8203;</span>
                          </span>
                          
                          <span className={`absolute bottom-1.5 right-2.5 text-[10px] font-medium ${isOwn ? 'text-[#54656f]' : 'text-slate-400'}`}>
                            {formatTime(message.created_at)}
                          </span>
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* BARRA DE DIGITAÇÃO */}
            <form className="bg-[#f0f2f5] p-3 flex items-end gap-2 shrink-0" onSubmit={handleSendMessage}>
              <div className="flex-1 bg-white rounded-xl shadow-sm flex items-center px-4 overflow-hidden">
                <input
                  type="text"
                  className="w-full h-12 bg-transparent border-0 outline-none text-slate-700 text-[15px] placeholder-slate-400"
                  placeholder="Digite uma mensagem"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={sending}
                />
              </div>
              <button
                type="submit"
                disabled={sending || !messageInput.trim()}
                className="w-12 h-12 rounded-full bg-[#00a884] text-white flex items-center justify-center shrink-0 hover:bg-[#008f6f] active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? <Loader size={20} className="animate-spin" /> : <Send size={20} className="ml-1" />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}