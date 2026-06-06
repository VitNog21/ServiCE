import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, PauseCircle, Play, Trash2, X } from 'lucide-react';
import { supabase } from '../supabase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import '../css/my-listings.css';

const DELETE_REASON_OPTIONS = [
  { value: 'sold_elsewhere', label: 'Vendi noutra plataforma' },
  { value: 'stopped_selling', label: 'Desisti de vender' },
  { value: 'no_contacts', label: 'Não recebi contactos' },
  { value: 'other', label: 'Outro motivo' },
];

const MyListings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('ativo');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [manageMenuOpenId, setManageMenuOpenId] = useState(null);
  const [isVendaModalOpen, setIsVendaModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const toast = useToast();

  useEffect(() => {
    const fetchMyListings = async () => {
      try {
        setLoading(true);

        // 1. Lógica Híbrida de Autenticação
        const { data: { session } } = await supabase.auth.getSession();
        let currentUser = session?.user;

        if (!currentUser) {
          const savedUser = localStorage.getItem('service_user');
          if (savedUser) currentUser = JSON.parse(savedUser);
        }

        if (!currentUser) {
          navigate('/login');
          return;
        }

        setUser(currentUser);

        // 2. Buscar os anúncios DESTE utilizador
        const { data, error } = await supabase
          .from('listings')
          .select(`
            id,
            title,
            price,
            status,
            image_urls,
            created_at,
            category:categories(name)
          `)
          .eq('owner_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        setListings(data || []);

      } catch (error) {
        console.error('Erro ao buscar anúncios:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyListings();
  }, [navigate]);

  useEffect(() => {
    if (!manageMenuOpenId) {
      return undefined;
    }

    const closeMenu = () => setManageMenuOpenId(null);

    window.addEventListener('click', closeMenu);

    return () => window.removeEventListener('click', closeMenu);
  }, [manageMenuOpenId]);

  // Função para formatar moeda
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  };

  const openVendaModal = (listing) => {
    setSelectedListing(listing);
    setIsVendaModalOpen(true);
    setManageMenuOpenId(null);
  };

  const updateListingStatus = async (listingId, status) => {
    try {
      setUpdatingId(listingId);
      const { error } = await supabase
        .from('listings')
        .update({ status })
        .eq('id', listingId);

      if (error) throw error;
      
      setListings((currentListings) =>
        currentListings.map((listing) => (
          listing.id === listingId ? { ...listing, status } : listing
        ))
      );
    } catch (error) {
      console.error('Erro ao atualizar status do anúncio:', error);
      toast({ title: "Erro", description: "Não foi possível atualizar o anúncio.", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteListing = async (listingId) => {
    try {
      setUpdatingId(listingId);
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (error) throw error;

      setListings((currentListings) => currentListings.filter((listing) => listing.id !== listingId));
      setIsVendaModalOpen(false);
      toast({ title: "Sucesso", description: "Anúncio removido permanentemente." });
    } catch (error) {
      console.error('Erro ao apagar anúncio:', error);
      toast({ title: "Erro", description: "Não foi possível apagar o anúncio.", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkAsSold = async () => {
    if (!selectedListing) return;
    await updateListingStatus(selectedListing.id, 'sold');
    setIsVendaModalOpen(false);
    toast({ title: "Sucesso!", description: "Anúncio marcado como vendido." });
  };

  const activeListings = useMemo(
    () => listings.filter((listing) => listing.status === 'active' || listing.status === 'paused'),
    [listings]
  );

  const soldListings = useMemo(
    () => listings.filter((listing) => listing.status === 'sold'),
    [listings]
  );

  // Filtrar anúncios por aba
  const filteredListings = useMemo(() => {
    if (activeTab === 'ativo') {
      return activeListings;
    }

    return soldListings;
  }, [activeTab, activeListings, soldListings]);

  const getStatusLabel = (status) => {
    if (status === 'paused') return 'Pausado';
    if (status === 'sold') return 'Vendido';
    return 'Ativo';
  };

  const getStatusClassName = (status) => {
    if (status === 'paused') return 'status-badge status-paused';
    if (status === 'sold') return 'status-badge status-sold';
    return 'status-badge status-active';
  };

  const handleEditListing = (listingId) => {
    navigate(`/editar-anuncio/${listingId}`);
    setManageMenuOpenId(null);
  };

  const handleMarkAsSold = async (listingId) => {
    await updateListingStatus(listingId, 'sold');
    setManageMenuOpenId(null);
  };

  if (loading) {
    return (
      <div className="my-listings-container">
        <div className="loading-state">A carregar os seus anúncios...</div>
      </div>
    );
  }

  return (
    <div className="my-listings-container">
      <Button
        type="button"
        variant="ghost"
        className="mb-4"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      <div className="my-listings-header">
        <div>
          <h1>Meus Anúncios</h1>
          <p>Faça a gestão dos serviços que você oferece no ServiCE.</p>
        </div>
        <Button
          type="button"
          className="btn-create-new"
          onClick={() => navigate('/criar-anuncio')}
        >
          + Criar Anúncio
        </Button>
      </div>

      {/* Abas */}
      <div className="listings-tabs">
        <Button
          type="button"
          variant="ghost"
          className={`tab-button ${activeTab === 'ativo' ? 'active' : ''}`}
          onClick={() => setActiveTab('ativo')}
        >
          Meus Anúncios ({activeListings.length})
        </Button>
        <Button
          type="button"
          variant="ghost"
          className={`tab-button ${activeTab === 'vendidos' ? 'active' : ''}`}
          onClick={() => setActiveTab('vendidos')}
        >
          Anúncios Vendidos ({soldListings.length})
        </Button>
      </div>

      {filteredListings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h2>
            {activeTab === 'ativo'
              ? 'Você ainda não tem anúncios ativos'
              : 'Você não tem anúncios vendidos ainda'}
          </h2>
          <p>
            {activeTab === 'ativo'
              ? 'Comece a oferecer os seus serviços agora mesmo e alcance mais clientes.'
              : 'Quando você marcar um anúncio como concluído, ele aparecerá aqui.'}
          </p>
          {activeTab === 'ativo' && (
            <Button type="button" className="btn-primary" onClick={() => navigate('/criar-anuncio')}>
              Criar meu primeiro anúncio
            </Button>
          )}
        </div>
      ) : (
        <div className="listings-grid">
          {filteredListings.map(listing => (
            <div key={listing.id} className="listing-card">
              <Button
                type="button"
                variant="ghost"
                className="listing-hero"
                onClick={() => navigate(`/detalhes/${listing.id}`)}
              >
                <div className="listing-image-wrapper">
                {listing.image_urls && listing.image_urls.length > 0 ? (
                  <img src={listing.image_urls[0]} alt={listing.title} className="listing-image" />
                ) : (
                  <div className="listing-no-image">Sem Foto</div>
                )}
                  {/* Badge de Status */}
                  <span className={getStatusClassName(listing.status)}>
                    {getStatusLabel(listing.status)}
                  </span>
                </div>

                <div className="listing-preview">
                  <span className="listing-category">{listing.category?.name || 'Sem categoria'}</span>
                  <h3 className="listing-item-title">{listing.title}</h3>
                </div>
              </Button>
              
              <div className="listing-info">
                <div className="listing-price">{formatPrice(listing.price)}</div>
                
                <div className="listing-actions flex-wrap items-center">
                  <div className="relative ml-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 rounded-xl border-slate-200 text-slate-600 shadow-sm hover:border-[#0A847C]/30 hover:text-[#0A847C]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setManageMenuOpenId((current) => (current === listing.id ? null : listing.id));
                      }}
                      aria-label={`Gerir anúncio ${listing.title}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>

                    {manageMenuOpenId === listing.id && (
                      <div
                        className="absolute bottom-full right-0 z-30 mb-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                          onClick={() => handleEditListing(listing.id)}
                        >
                          Editar
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-emerald-600 font-bold transition-colors hover:bg-slate-50"
                          onClick={() => openVendaModal(listing)}
                          disabled={updatingId === listing.id || listing.status === 'sold'}
                        >
                          <CheckCircle2 className="h-4 w-4" /> Venda Efetuada
                        </Button>

                        {listing.status === 'active' && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                            onClick={() => pauseListing(listing.id)}
                            disabled={updatingId === listing.id}
                          >
                            <PauseCircle className="h-4 w-4 text-slate-500" />
                            Pausar Anúncio
                          </Button>
                        )}

                        {listing.status === 'paused' && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                            onClick={() => reactivateListing(listing.id)}
                            disabled={updatingId === listing.id}
                          >
                            <Play className="h-4 w-4 text-emerald-600" />
                            Reativar anúncio
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                          onClick={() => openVendaModal(listing)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL VENDA EFETUADA / EXCLUIR (Requirement: Seção 3 do Escopo) */}
      <Dialog open={isVendaModalOpen} onOpenChange={setIsVendaModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Venda Efetuada?</DialogTitle>
            <DialogDescription className="text-slate-500">
              Como deseja finalizar este anúncio? Escolha "Vendido" para manter no seu histórico ou "Remover" para apagar permanentemente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 py-6">
            <Button 
              className="h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex gap-2"
              onClick={handleMarkAsSold}
              disabled={updatingId === selectedListing?.id}
            >
              <CheckCircle2 className="h-5 w-5" />
              Marcar como Vendido
            </Button>
            
            <Button 
              variant="outline" 
              className="h-14 text-red-600 border-red-200 hover:bg-red-50 font-bold rounded-xl flex gap-2"
              onClick={() => deleteListing(selectedListing.id)}
              disabled={updatingId === selectedListing?.id}
            >
              <Trash2 className="h-5 w-5" />
              Remover Definitivamente
            </Button>
          </div>

          <DialogFooter className="flex justify-center border-t border-slate-100 pt-4">
            <DialogClose asChild>
              <Button variant="ghost" className="text-slate-400">Cancelar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyListings;