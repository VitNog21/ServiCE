import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, PauseCircle, Play, Trash2, X, CheckCircle2 } from 'lucide-react';
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
import { useToast } from '@/components/ui/toast';
import '../css/my-listings.css';

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
    if (!manageMenuOpenId) return undefined;
    const closeMenu = () => setManageMenuOpenId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, [manageMenuOpenId]);

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
      
      setListings((current) =>
        current.map((l) => (l.id === listingId ? { ...l, status } : l))
      );
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
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

      setListings((current) => current.filter((l) => l.id !== listingId));
      setIsVendaModalOpen(false);
      toast.success("Anúncio removido.");
    } catch (error) {
      console.error('Erro ao apagar:', error);
      toast.error("Erro ao apagar anúncio.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkAsSold = async () => {
    if (!selectedListing) return;
    await updateListingStatus(selectedListing.id, 'sold');
    setIsVendaModalOpen(false);
    toast.success("Anúncio marcado como vendido.");
  };

  const activeListings = useMemo(
    () => listings.filter((l) => l.status === 'active' || l.status === 'paused'),
    [listings]
  );

  const soldListings = useMemo(
    () => listings.filter((l) => l.status === 'sold'),
    [listings]
  );

  const filteredListings = activeTab === 'ativo' ? activeListings : soldListings;

  return (
    <div className="my-listings-container">
      <div className="my-listings-header-section">
        <Button variant="ghost" className="mb-4 hover:bg-[var(--gray-100)]" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <div className="my-listings-header-content">
          <div>
            <h1>Meus Anúncios</h1>
            <p>Faça a gestão dos seus serviços e vendas.</p>
          </div>
          <Button className="btn-create-new" onClick={() => navigate('/criar-anuncio')}>
            + Criar Novo Anúncio
          </Button>
        </div>
      </div>

      <div className="listings-tabs-container">
        <button
          className={`tab-button ${activeTab === 'ativo' ? 'active' : ''}`}
          onClick={() => setActiveTab('ativo')}
        >
          <span className="font-semibold">Ativos</span>
          <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" style={{backgroundColor: activeTab === 'ativo' ? 'var(--green-700)' : 'var(--gray-200)', color: activeTab === 'ativo' ? 'white' : 'var(--gray-600)'}}>
            {activeListings.length}
          </span>
        </button>
        <button
          className={`tab-button ${activeTab === 'vendidos' ? 'active' : ''}`}
          onClick={() => setActiveTab('vendidos')}
        >
          <span className="font-semibold">Vendidos</span>
          <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold" style={{backgroundColor: activeTab === 'vendidos' ? 'var(--green-700)' : 'var(--gray-200)', color: activeTab === 'vendidos' ? 'white' : 'var(--gray-600)'}}>
            {soldListings.length}
          </span>
        </button>
      </div>

      {filteredListings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h2>{activeTab === 'ativo' ? 'Sem anúncios ativos' : 'Sem anúncios vendidos'}</h2>
          {activeTab === 'ativo' && (
            <Button className="btn-primary" onClick={() => navigate('/criar-anuncio')}>
              Criar meu primeiro anúncio
            </Button>
          )}
        </div>
      ) : (
        <div className="listings-grid">
          {filteredListings.map(listing => (
            <div key={listing.id} className="listing-card">
              <div className="listing-hero" onClick={() => navigate(`/detalhes/${listing.id}`)}>
                <div className="listing-image-wrapper">
                  {listing.image_urls?.[0] ? (
                    <img src={listing.image_urls[0]} alt={listing.title} className="listing-image" />
                  ) : (
                    <div className="listing-no-image">Sem Foto</div>
                  )}
                  <span className={`status-badge status-${listing.status}`}>
                    {listing.status === 'paused' ? 'Pausado' : listing.status === 'sold' ? 'Vendido' : 'Ativo'}
                  </span>
                </div>
                <div className="listing-preview">
                  <span className="listing-category">{listing.category?.name}</span>
                  <h3 className="listing-item-title">{listing.title}</h3>
                </div>
              </div>
              
              <div className="listing-info">
                <div className="listing-price">{formatPrice(listing.price)}</div>
                <div className="relative ml-auto">
                  <Button
                    variant="outline" size="icon" className="h-10 w-10 rounded-xl"
                    onClick={(e) => {
                      e.stopPropagation();
                      setManageMenuOpenId(current => current === listing.id ? null : listing.id);
                    }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>

                  {manageMenuOpenId === listing.id && (
                    <div className="absolute bottom-full right-0 z-30 mb-2 w-52 overflow-hidden rounded-xl border bg-white p-1 shadow-xl">
                      <button className="menu-item p-3 w-full text-left hover:bg-slate-50" onClick={() => navigate(`/editar-anuncio/${listing.id}`)}>Editar</button>
                      
                      {listing.status === 'active' && (
                        <>
                          <button className="menu-item p-3 w-full text-left hover:bg-slate-50 text-emerald-600 font-bold" onClick={() => openVendaModal(listing)}>
                            <CheckCircle2 className="h-4 w-4 inline mr-2" /> Venda Efetuada
                          </button>
                          <button className="menu-item p-3 w-full text-left hover:bg-slate-50" onClick={() => updateListingStatus(listing.id, 'paused')}>Pausar</button>
                        </>
                      )}
                      
                      {listing.status === 'paused' && (
                        <button className="menu-item p-3 w-full text-left hover:bg-slate-50" onClick={() => updateListingStatus(listing.id, 'active')}>Reativar</button>
                      )}

                      <button className="menu-item p-3 w-full text-left hover:bg-red-50 text-red-600" onClick={() => openVendaModal(listing)}>Excluir</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL VENDA EFETUADA / EXCLUIR */}
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