import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, X, ImagePlus } from 'lucide-react';

const MAX_IMAGES = 5;
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
  const [previews, setPreviews] = useState([]);
  const [selectedCoordinates, setSelectedCoordinates] = useState({ lat: null, lon: null });

  // Limpa as object URLs ao desmontar o componente (evita memory leak)
  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

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
          console.warn("Usuário não autenticado, redirecionando para login...");
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

    // Filtra por tipo e tamanho (máx 5 MB cada)
    const validFiles = selectedFiles.filter(
      (f) => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024
    );

    if (validFiles.length !== selectedFiles.length) {
      setMessage({ type: 'error', text: 'Alguns arquivos são inválidos ou excedem 5 MB.' });
    }

    // Acumula com as já selecionadas, respeitando o limite de MAX_IMAGES
    const combined = [...files, ...validFiles].slice(0, MAX_IMAGES);

    if (files.length + validFiles.length > MAX_IMAGES) {
      setMessage({ type: 'error', text: `Máximo de ${MAX_IMAGES} fotos por anúncio.` });
    }

    // Revoga URLs antigas antes de criar novas (evita memory leak)
    previews.forEach((url) => URL.revokeObjectURL(url));

    setFiles(combined);
    setPreviews(combined.map((f) => URL.createObjectURL(f)));

    // Reseta o input para permitir re-seleção do mesmo arquivo
    e.target.value = '';
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
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
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Fotos do Serviço</span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: files.length >= MAX_IMAGES ? '#0A847C' : '#94a3b8' }}>
                {files.length}/{MAX_IMAGES} foto{files.length !== 1 ? 's' : ''}
              </span>
            </label>

            {/* Input oculto — ativado pelo label ou pelo slot "+" */}
            <input
              type="file"
              multiple
              accept="image/*"
              id="listing-images"
              onChange={handleFileChange}
              disabled={loading || files.length >= MAX_IMAGES}
              style={{ display: 'none' }}
            />

            {/* ── Grid de previews ── */}
            {previews.length > 0 ? (
              <div style={{
                border: '2px dashed #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                background: '#f8fafc',
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                  gap: '12px',
                }}>
                  {/* Miniaturas das imagens selecionadas */}
                  {previews.map((url, index) => (
                    <div key={index} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', aspectRatio: '1/1', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                      <img
                        src={url}
                        alt={`Foto ${index + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      {/* Badge "Capa" na primeira imagem */}
                      {index === 0 && (
                        <span style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          background: 'rgba(10,132,124,0.85)', color: '#fff',
                          fontSize: '10px', fontWeight: 700, textAlign: 'center',
                          padding: '3px 0', letterSpacing: '0.5px', textTransform: 'uppercase',
                        }}>
                          Capa
                        </span>
                      )}
                      {/* Botão remover */}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        disabled={loading}
                        style={{
                          position: 'absolute', top: '5px', right: '5px',
                          background: 'rgba(0,0,0,0.55)', color: '#fff',
                          border: 'none', borderRadius: '50%',
                          width: '22px', height: '22px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: 0, transition: 'background 0.15s',
                        }}
                        title="Remover foto"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {/* Slot "+" para adicionar mais (enquanto < MAX_IMAGES) */}
                  {files.length < MAX_IMAGES && (
                    <label
                      htmlFor="listing-images"
                      style={{
                        border: '2px dashed #cbd5e1', borderRadius: '10px',
                        aspectRatio: '1/1', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        color: '#94a3b8', gap: '4px', transition: 'all 0.2s',
                        background: 'white',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0A847C'; e.currentTarget.style.color = '#0A847C'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#94a3b8'; }}
                    >
                      <ImagePlus size={22} />
                      <span style={{ fontSize: '11px', fontWeight: 600 }}>Adicionar</span>
                    </label>
                  )}
                </div>

                <p style={{ marginTop: '10px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                  A 1ª foto será a capa do anúncio · Arraste para reordenar · Máx. 5 MB por foto
                </p>
              </div>
            ) : (
              /* ── Estado vazio — nenhuma imagem ── */
              <div className="file-upload-wrapper">
                <label htmlFor="listing-images" className="btn-upload-secondary" style={{ cursor: loading ? 'not-allowed' : 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ImagePlus size={16} />
                    Escolher Imagens
                  </span>
                </label>
                <span className="file-count">
                  Nenhuma imagem selecionada &nbsp;·&nbsp; mínimo 1, máximo {MAX_IMAGES} fotos
                </span>
              </div>
            )}
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