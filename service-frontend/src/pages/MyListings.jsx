import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, RotateCcw, X } from 'lucide-react';
import { supabase } from '../supabase';
import { Button } from '@/components/ui/button';
import '../css/my-listings.css';

const MyListings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('ativo'); // 'ativo' ou 'vendidos'
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, listingId: null, action: null });

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

  // Função para formatar moeda
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  };

  // Função para abrir modal de vendido
  const openModalForSold = (listingId) => {
    setModal({ isOpen: true, listingId, action: 'sold' });
  };

  // Função para fechar modal
  const closeModal = () => {
    setModal({ isOpen: false, listingId: null, action: null });
  };

  // Função para marcar como concluído (vendido)
  const markAsSold = async (listingId) => {
    try {
      setUpdatingId(listingId);
      const { data, error } = await supabase
        .from('listings')
        .update({ status: 'sold' })
        .eq('id', listingId)
        .select();

      if (error) throw error;
      
      // Atualizar a lista local
      setListings(listings.map(listing => 
        listing.id === listingId ? { ...listing, status: 'sold' } : listing
      ));
    } catch (error) {
      console.error('Erro ao marcar como vendido:', error);
      alert('Erro ao marcar anúncio como concluído');
    } finally {
      setUpdatingId(null);
    }
  };

  // Função para deletar anúncio
  const deleteListing = async (listingId) => {
    try {
      setUpdatingId(listingId);
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (error) throw error;
      
      // Remover da lista local
      setListings(listings.filter(listing => listing.id !== listingId));
    } catch (error) {
      console.error('Erro ao apagar anúncio:', error);
      alert('Erro ao apagar anúncio');
    } finally {
      setUpdatingId(null);
    }
  };

  // Função para reverter para ativo
  const markAsActive = async (listingId) => {
    try {
      setUpdatingId(listingId);
      const { data, error } = await supabase
        .from('listings')
        .update({ status: 'active' })
        .eq('id', listingId)
        .select();

      if (error) throw error;
      
      // Atualizar a lista local
      setListings(listings.map(listing => 
        listing.id === listingId ? { ...listing, status: 'active' } : listing
      ));
    } catch (error) {
      console.error('Erro ao reverter para ativo:', error);
      alert('Erro ao reverter anúncio');
    } finally {
      setUpdatingId(null);
    }
  };

  // Filtrar anúncios por aba
  const filteredListings = listings.filter(listing =>
    activeTab === 'ativo' ? listing.status === 'active' : listing.status === 'sold'
  );

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
          Meus Anúncios ({listings.filter(l => l.status === 'active').length})
        </button>
        <button
          className={`tab-button ${activeTab === 'vendidos' ? 'active' : ''}`}
          onClick={() => setActiveTab('vendidos')}
        >
          Anúncios Vendidos ({listings.filter(l => l.status === 'sold').length})
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
              <div className="listing-image-wrapper">
                {listing.image_urls && listing.image_urls.length > 0 ? (
                  <img src={listing.image_urls[0]} alt={listing.title} className="listing-image" />
                ) : (
                  <div className="listing-no-image">Sem Foto</div>
                )}
                
                {/* Badge de Status */}
                <span className={`status-badge status-${listing.status}`}>
                  {listing.status === 'active' ? 'Ativo' : 'Vendido'}
                </span>
              </div>
              
              <div className="listing-info">
                <span className="listing-category">{listing.category?.name || 'Sem categoria'}</span>
                <h3 className="listing-item-title">{listing.title}</h3>
                <div className="listing-price">{formatPrice(listing.price)}</div>
                
                <div className="listing-actions">
                  {activeTab === 'ativo' && (
                    <>
                      <button className="btn-edit-listing">Editar</button>
                      <button
                        className="btn-complete-listing"
                        onClick={() => openModalForSold(listing.id)}
                        disabled={updatingId === listing.id}
                      >
                        <Check className="h-4 w-4" />
                        {updatingId === listing.id ? 'A processar...' : 'Concluído'}
                      </button>
                    </>
                  )}
                  {activeTab === 'vendidos' && (
                    <>
                      <button
                        className="btn-revert-listing"
                        onClick={() => markAsActive(listing.id)}
                        disabled={updatingId === listing.id}
                      >
                        <RotateCcw className="h-4 w-4" />
                        {updatingId === listing.id ? 'A processar...' : 'Reativar'}
                      </button>
                      <button
                        className="btn-delete-listing"
                        onClick={async () => {
                          if (window.confirm('Tem certeza que deseja apagar este anúncio definitivamente?')) {
                            await deleteListing(listing.id);
                          }
                        }}
                        disabled={updatingId === listing.id}
                      >
                        Apagar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Confirmação */}
      {modal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#0A3B66', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                O que deseja fazer?
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  color: '#64748b'
                }}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <p style={{ color: '#64748b', marginBottom: '28px', lineHeight: '1.5', fontSize: '14px' }}>
              Escolha se deseja marcar este anúncio como vendido ou apagá-lo permanentemente.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Botão Marcar como Vendido */}
              <button
                onClick={async () => {
                  await markAsSold(modal.listingId);
                  closeModal();
                }}
                disabled={updatingId === modal.listingId}
                style={{
                  padding: '14px 20px',
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: updatingId === modal.listingId ? 'not-allowed' : 'pointer',
                  opacity: updatingId === modal.listingId ? 0.6 : 1,
                  transition: 'all 0.2s',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  if (updatingId !== modal.listingId) {
                    e.target.style.backgroundColor = '#059669';
                  }
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#10B981';
                }}
              >
                <Check className="h-4 w-4" />
                {updatingId === modal.listingId ? 'A processar...' : 'Marcar como Vendido'}
              </button>

              {/* Botão Apagar */}
              <button
                onClick={async () => {
                  await deleteListing(modal.listingId);
                  closeModal();
                }}
                disabled={updatingId === modal.listingId}
                style={{
                  padding: '14px 20px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: updatingId === modal.listingId ? 'not-allowed' : 'pointer',
                  opacity: updatingId === modal.listingId ? 0.6 : 1,
                  transition: 'all 0.2s',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  if (updatingId !== modal.listingId) {
                    e.target.style.backgroundColor = '#dc2626';
                  }
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#ef4444';
                }}
              >
                🗑️ Apagar Definivamente
              </button>

              {/* Botão Cancelar */}
              <button
                onClick={closeModal}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  fontSize: '14px'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#e2e8f0'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#f1f5f9'}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyListings;