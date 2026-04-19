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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [deleteReason, setDeleteReason] = useState('sold_elsewhere');
  const [deleteReasonDetails, setDeleteReasonDetails] = useState('');
  const [deleteError, setDeleteError] = useState('');

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

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedListing(null);
    setDeleteReason('sold_elsewhere');
    setDeleteReasonDetails('');
    setDeleteError('');
  };

  const openDeleteModal = (listing) => {
    setSelectedListing(listing);
    setDeleteReason('sold_elsewhere');
    setDeleteReasonDetails('');
    setDeleteError('');
    setIsDeleteModalOpen(true);
    setManageMenuOpenId(null);
  };

  const updateListingStatus = async (listingId, status) => {
    try {
      setUpdatingId(listingId);
      const { error } = await supabase
        .from('listings')
        .update({ status })
        .eq('id', listingId)
        .select();

      if (error) throw error;
      
      setListings((currentListings) =>
        currentListings.map((listing) => (
          listing.id === listingId ? { ...listing, status } : listing
        ))
      );
    } catch (error) {
      console.error('Erro ao atualizar status do anúncio:', error);
      alert('Erro ao atualizar anúncio');
    } finally {
      setUpdatingId(null);
    }
  };

  const pauseListing = async (listingId) => {
    await updateListingStatus(listingId, 'paused');
    setManageMenuOpenId(null);
  };

  const reactivateListing = async (listingId) => {
    await updateListingStatus(listingId, 'active');
    setManageMenuOpenId(null);
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
    } catch (error) {
      console.error('Erro ao apagar anúncio:', error);
      alert('Erro ao apagar anúncio');
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmDeleteListing = async () => {
    if (!selectedListing) {
      return;
    }

    if (deleteReason === 'other' && !deleteReasonDetails.trim()) {
      setDeleteError('Descreva o motivo para continuar.');
      return;
    }

    setDeleteError('');

    await deleteListing(selectedListing.id);
    closeDeleteModal();
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
        <button
          className={`tab-button ${activeTab === 'ativo' ? 'active' : ''}`}
          onClick={() => setActiveTab('ativo')}
        >
          Meus Anúncios ({activeListings.length})
        </button>
        <button
          className={`tab-button ${activeTab === 'vendidos' ? 'active' : ''}`}
          onClick={() => setActiveTab('vendidos')}
        >
          Anúncios Vendidos ({soldListings.length})
        </button>
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
              <button
                type="button"
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
              </button>
              
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
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                          onClick={() => handleEditListing(listing.id)}
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                          onClick={() => handleMarkAsSold(listing.id)}
                          disabled={updatingId === listing.id || listing.status === 'sold'}
                        >
                          Marcar como Vendido
                        </button>

                        {listing.status === 'active' && (
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                            onClick={() => pauseListing(listing.id)}
                            disabled={updatingId === listing.id}
                          >
                            <PauseCircle className="h-4 w-4 text-slate-500" />
                            Pausar Anúncio
                          </button>
                        )}

                        {listing.status === 'paused' && (
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                            onClick={() => reactivateListing(listing.id)}
                            disabled={updatingId === listing.id}
                          >
                            <Play className="h-4 w-4 text-emerald-600" />
                            Reativar anúncio
                          </button>
                        )}

                        <button
                          type="button"
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                          onClick={() => openDeleteModal(listing)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={isDeleteModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteModal();
            setManageMenuOpenId(null);
            return;
          }

          setIsDeleteModalOpen(true);
        }}
      >
        <DialogContent className="max-w-2xl border-0 p-0 shadow-[0_24px_80px_rgba(15,23,42,0.2)]">
          <DialogHeader className="border-b border-slate-100 px-6 py-5 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <DialogTitle className="text-2xl font-semibold text-slate-900">
                  Por que deseja excluir este anúncio?
                </DialogTitle>
                <DialogDescription className="max-w-xl text-sm leading-6 text-slate-500">
                  Queremos entender o motivo antes de apagar permanentemente o anúncio.
                  Esta ação não pode ser desfeita.
                </DialogDescription>
              </div>

              <DialogClose asChild>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Fechar modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="space-y-6 px-6 py-6 sm:px-8">
            <div className="space-y-3">
              {DELETE_REASON_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
                    deleteReason === option.value
                      ? 'border-[#0A847C] bg-[#f1fbfa]'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteReason"
                    value={option.value}
                    checked={deleteReason === option.value}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="h-4 w-4 border-slate-300 text-[#0A847C] focus:ring-[#0A847C]"
                  />
                  <span className="text-sm font-medium text-slate-700">{option.label}</span>
                </label>
              ))}
            </div>

            {deleteReason === 'other' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Detalhe o motivo</label>
                <Textarea
                  value={deleteReasonDetails}
                  onChange={(e) => setDeleteReasonDetails(e.target.value)}
                  placeholder="Explique brevemente por que deseja excluir este anúncio..."
                  className="min-h-[120px] rounded-2xl border-slate-200 bg-slate-50"
                />
              </div>
            )}

            {deleteError && (
              <p className="text-sm font-medium text-red-600">{deleteError}</p>
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:justify-between sm:px-8">
            <Button
              type="button"
              variant="ghost"
              onClick={closeDeleteModal}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              className="w-full gap-2 bg-red-600 text-white hover:bg-red-700 sm:w-auto"
              onClick={confirmDeleteListing}
              disabled={updatingId === selectedListing?.id}
            >
              <Trash2 className="h-4 w-4" />
              {updatingId === selectedListing?.id ? 'A apagar...' : 'Excluir Definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyListings;