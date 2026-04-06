import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';
import { Button } from '@/components/ui/button';
import '../css/my-listings.css';

const MyListings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyListings = async () => {
      try {
        setLoading(true);

        // 1. Lógica Híbrida de Autenticação (A mesma da Home)
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

      {listings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h2>Você ainda não tem anúncios</h2>
          <p>Comece a oferecer os seus serviços agora mesmo e alcance mais clientes.</p>
          <Button type="button" className="btn-primary" onClick={() => navigate('/criar-anuncio')}>
            Criar meu primeiro anúncio
          </Button>
        </div>
      ) : (
        <div className="listings-grid">
          {listings.map(listing => (
            <div key={listing.id} className="listing-card">
              <div className="listing-image-wrapper">
                {listing.image_urls && listing.image_urls.length > 0 ? (
                  <img src={listing.image_urls[0]} alt={listing.title} className="listing-image" />
                ) : (
                  <div className="listing-no-image">Sem Foto</div>
                )}
                
                {/* Badge de Status */}
                <span className={`status-badge status-${listing.status}`}>
                  {listing.status === 'active' ? 'Ativo' : 
                   listing.status === 'sold' ? 'Pausado' : 'Oculto'}
                </span>
              </div>
              
              <div className="listing-info">
                <span className="listing-category">{listing.category?.name || 'Sem categoria'}</span>
                <h3 className="listing-item-title">{listing.title}</h3>
                <div className="listing-price">{formatPrice(listing.price)}</div>
                
                <div className="listing-actions">
                  <button className="btn-edit-listing">Editar</button>
                  <button className="btn-delete-listing">Apagar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyListings;