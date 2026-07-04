import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';
import { Button } from '@/components/ui/button';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import '../css/create-listing.css';

const CreateListing = () => {
  const navigate = useNavigate();
  const { listingId } = useParams();
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editListing, setEditListing] = useState(null);
  const isEditMode = Boolean(listingId);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category_id: '',
    address_text: '',
  });

  const [files, setFiles] = useState([]);
  const [selectedCoordinates, setSelectedCoordinates] = useState({ lat: null, lon: null });

  // 1. Verificação de Sessão (Híbrida) e Busca de Dados
  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        let currentUser = null;

        // A. Tenta buscar a sessão oficial (Google ou Email Supabase)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          currentUser = session.user;
        } else {
          // B. Fallback: Procura no localStorage (o seu login antigo/teste)
          const savedUser = localStorage.getItem('service_user');
          if (savedUser) {
            try {
              currentUser = JSON.parse(savedUser);
            } catch (e) {
              console.error('Erro ao ler localStorage:', e);
            }
          }
        }

        // C. Se falhar nas duas opções, aí sim expulsa para o login
        if (!currentUser) {
          console.warn("Usuário não autenticado, redirecionando para login");
          navigate('/login');
          return;
        }

        // Se chegou aqui, o utilizador está validado!
        setUser(currentUser);

        // D. Busca as categorias para preencher o select
        const { data: cats, error: catsError } = await supabase
          .from('categories')
          .select('*')
          .order('name');
          
        if (catsError) throw catsError;
        if (cats) setCategories(cats);

        if (listingId) {
          const { data: listingData, error: listingError } = await supabase
            .from('listings')
            .select(`
              id,
              title,
              description,
              price,
              image_urls,
              category_id,
              address_text,
              owner_id
            `)
            .eq('id', listingId)
            .single();

          if (listingError) throw listingError;

          if (!listingData || listingData.owner_id !== currentUser.id) {
            setMessage({ type: 'error', text: 'Você não tem permissão para editar este anúncio.' });
            navigate('/meus-anuncios');
            return;
          }

          setEditListing(listingData);
          setFormData({
            title: listingData.title || '',
            description: listingData.description || '',
            price: listingData.price?.toString() || '',
            category_id: listingData.category_id?.toString() || '',
            address_text: listingData.address_text || '',
          });
        }

      } catch (error) {
        console.error("Erro na inicialização:", error);
        setMessage({ type: 'error', text: 'Erro ao carregar dados necessários.' });
      } finally {
        setInitializing(false);
      }
    };

    checkAuthAndFetchData();
  }, [listingId, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressInputChange = (addressText) => {
    setFormData(prev => ({ ...prev, address_text: addressText }));
    setSelectedCoordinates({ lat: null, lon: null });
  };

  const handleAddressSelect = ({ display_name, lat, lon }) => {
    setFormData(prev => ({ ...prev, address_text: display_name }));
    setSelectedCoordinates({ lat, lon });
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Validação básica de tipo e tamanho (máx 5MB)
    const validFiles = selectedFiles.filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024);
    
    if (validFiles.length !== selectedFiles.length) {
      setMessage({ type: 'error', text: 'Alguns ficheiros não são imagens válidas ou excedem 5MB.' });
    }
    
    setFiles(validFiles);
  };

  // 2. Submissão do Anúncio
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (!formData.title || !formData.price || !formData.category_id) {
      setMessage({ type: 'error', text: 'Preencha os campos obrigatórios (Título, Categoria e Preço).' });
      setLoading(false);
      return;
    }

      const addressChanged = isEditMode && editListing
        ? formData.address_text.trim() !== (editListing.address_text || '').trim()
        : false;

      if ((!isEditMode || addressChanged) && (!formData.address_text || selectedCoordinates.lat === null || selectedCoordinates.lon === null)) {
      setMessage({ type: 'error', text: 'Selecione um endereço válido na lista de sugestões.' });
      setLoading(false);
      return;
    }

    try {
      // Passo A: Upload das Imagens (se existirem)
      const uploadedUrls = [];
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('listing_images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('listing_images')
          .getPublicUrl(fileName);
        
        uploadedUrls.push(urlData.publicUrl);
      }

      if (isEditMode) {
        const payload = {
          title: formData.title,
          description: formData.description,
          price: parseFloat(formData.price),
          category_id: parseInt(formData.category_id),
          address_text: formData.address_text,
        };

        if (uploadedUrls.length > 0) {
          payload.image_urls = uploadedUrls;
        } else if (editListing?.image_urls?.length) {
          payload.image_urls = editListing.image_urls;
        }

        const { error: updateError } = await supabase
          .from('listings')
          .update(payload)
          .eq('id', listingId)
          .eq('owner_id', user.id);

        if (updateError) throw updateError;

        setMessage({ type: 'success', text: 'Anúncio atualizado com sucesso!' });
        setTimeout(() => navigate('/meus-anuncios'), 1500);
      } else {
        // Passo B: Inserção no Banco de Dados
        // NOTA: Estamos a usar a RPC 'create_listing_safely' que definimos no SQL 
        // para resolver a exigência do PostGIS (coluna location NOT NULL).
        const { error: rpcError } = await supabase.rpc('create_listing_safely', {
          p_owner_id: user.id,
          p_category_id: parseInt(formData.category_id),
          p_title: formData.title,
          p_description: formData.description,
          p_price: parseFloat(formData.price),
          p_address_text: formData.address_text,
          p_image_urls: uploadedUrls,
          p_lat: selectedCoordinates.lat,
          p_lng: selectedCoordinates.lon
        });

        if (rpcError) throw rpcError;

        // Sucesso!
        setMessage({ type: 'success', text: 'Anúncio publicado com sucesso!' });
        
        // Limpa o formulário e redireciona após 1.5 segundos
        setTimeout(() => navigate('/meus-anuncios'), 1500);
      }

    } catch (error) {
      console.error('Falha ao criar anúncio:', error);
        setMessage({ type: 'error', text: error.message || (isEditMode ? 'Erro ao atualizar o anúncio.' : 'Erro ao publicar o anúncio. Verifique se configurou o banco.') });
    } finally {
      setLoading(false);
    }
  };

  // Previne renderização do formulário se o utilizador ainda estiver a ser validado
  if (!user) return null;
  if (!user || initializing) return null;
  return (
    <div className="create-listing-container">
      <div className="form-card">
        <Button
          type="button"
          variant="ghost"
          className="mb-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <h2>{isEditMode ? 'Editar Anúncio' : 'Criar Novo Anúncio'}</h2>
        
        {message.text && (
          <div className={`alert ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* TÍTULO */}
          <div className="input-group">
            <label>Título do Serviço *</label>
            <input 
              name="title" 
              required 
              value={formData.title}
              onChange={handleInputChange} 
              placeholder="Ex: Eletricista Residencial" 
              disabled={loading}
            />
          </div>

          {/* CATEGORIA E PREÇO */}
          <div className="row">
            <div className="input-group">
              <label>Categoria *</label>
              <select 
                name="category_id" 
                required 
                value={formData.category_id}
                onChange={handleInputChange}
                disabled={loading}
              >
                <option value="">Selecionar categoria...</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div className="input-group">
              <label>Preço Base (R$) *</label>
              <input 
                name="price" 
                type="number" 
                step="0.01" 
                min="0"
                required 
                value={formData.price}
                onChange={handleInputChange} 
                placeholder="Ex: 150.00" 
                disabled={loading}
              />
            </div>
          </div>

          {/* DESCRIÇÃO */}
          <div className="input-group">
            <label>Descrição do Serviço</label>
            <textarea 
              name="description" 
              rows="5" 
              value={formData.description}
              onChange={handleInputChange} 
              placeholder="Descreva o que está incluído no serviço, o seu tempo de experiência, etc..." 
              disabled={loading}
            />
          </div>

          {/* LOCALIZAÇÃO (AUTOCOMPLETE OSM) */}
          <div className="input-group">
            <label>Endereço / Região de Atendimento *</label>
            <AddressAutocomplete
              value={formData.address_text}
              onChange={handleAddressInputChange}
              onAddressSelect={handleAddressSelect}
              disabled={loading}
              required
            />
          </div>

          {/* FOTOS */}
          <div className="input-group">
            <label>Fotos do Serviço (Opcional)</label>
            <div className="file-upload-wrapper">
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                id="listing-images"
                onChange={handleFileChange} 
                className="file-input" 
                disabled={loading}
                style={{ display: 'none' }}
              />
              <label htmlFor="listing-images" className="btn-upload-secondary">
                Escolher Imagens
              </label>
              <span className="file-count">
                {files.length > 0 ? `${files.length} ficheiro(s) selecionado(s)` : 'Nenhuma imagem selecionada'}
              </span>
            </div>
          </div>

          {/* BOTÕES */}
          <div className="button-group">
            <Button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'A processar...' : isEditMode ? 'Atualizar Anúncio' : 'Publicar Anúncio'}
            </Button>
            <Button type="button" variant="outline" className="btn-cancel" onClick={() => navigate('/meus-anuncios')} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateListing;
