import React, { useState, useEffect } from 'react';
import {
  Button, IconButton, TextField, Typography, CircularProgress,
  Tabs, Tab, Box
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import DetailImageModal from '../components/detailImageModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import OpenAI from 'openai';

// File OCR cho "trong trường"
import ocr_008 from '../assets/ocr_008.txt';

interface OCRImageType {
  vxxx: string;  // ví dụ: "V008"
  index: number; // ví dụ: 123
}

// Initialize OpenAI client (ideally this should be on a backend)
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const TrongTruong: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [ocrImages, setOcrImages] = useState<OCRImageType[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [resultCount, setResultCount] = useState<number | null>(null);
  const [listening, setListening] = useState<boolean>(false);

  // Modal state
  const [open, setOpen] = useState<boolean>(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [currentImage, setCurrentImage] = useState<number>(0);
  const [idCurrentImage, setIdCurrentImage] = useState<number>(0);

  // Precompute embeddings for OCR data (you can do this once and cache it)
  const [ocrEmbeddings, setOcrEmbeddings] = useState<any[]>([]);

  useEffect(() => {
    const loadOcrDataAndEmbeddings = async () => {
      try {
        const response = await fetch(ocr_008);
        const text = await response.text();
        const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

        // Prepare OCR data
        const ocrData = lines.map(line => {
          const beforeColon = line.split(':')[0];
          const [vxxx, idx] = beforeColon.split('_');
          return {
            content: line.split(':')[1].trim(), // The text after the colon
            vxxx,
            index: parseInt(idx, 10),
          };
        });

        // Generate embeddings for each OCR entry
        const embeddingsPromises = ocrData.map(async (item) => {
          const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: item.content,
          });
          return {
            ...item,
            embedding: embeddingResponse.data[0].embedding,
          };
        });

        const embeddings = await Promise.all(embeddingsPromises);
        setOcrEmbeddings(embeddings);
      } catch (error) {
        console.error('Error generating embeddings for OCR data:', error);
      }
    };

    loadOcrDataAndEmbeddings();
  }, []);

  // Cosine similarity function to compare embeddings
  const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  };

  // Search using embeddings
  const handleOCR = async () => {
    if (!searchText || ocrEmbeddings.length === 0) return;

    setLoading(true);
    try {
      // Generate embedding for the query
      const queryEmbeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: searchText,
      });
      const queryEmbedding = queryEmbeddingResponse.data[0].embedding;

      // Compute similarity between query and each OCR entry
      const results = ocrEmbeddings
        .map(item => ({
          ...item,
          similarity: cosineSimilarity(queryEmbedding, item.embedding),
        }))
        .filter(item => item.similarity > 0.8) // Threshold for similarity (adjust as needed)
        .sort((a, b) => b.similarity - a.similarity); // Sort by similarity

      // Map to the format your app expects
      const matchedImages = results.map(item => ({
        vxxx: item.vxxx,
        index: item.index,
      }));

      setOcrImages(matchedImages);
      setResultCount(matchedImages.length);
      console.log('Semantic search results:', matchedImages);
    } catch (error) {
      console.error('Error during semantic search:', error);
      setResultCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  };

  const handleOcrImageClick = (index: number) => {
    const allOcrUrls = ocrImages.map(item => `${item.vxxx}_${item.index}`);
    setModalImages(allOcrUrls);
    setCurrentImage(index);
    setIdCurrentImage(0);
    setOpen(true);
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Browser does not support Speech Recognition");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setListening(true);
    recognition.start();
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchText(transcript);
      setListening(false);
    };
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };
  };

  const handleClose = () => setOpen(false);
  const handleNext = () => setCurrentImage(prev => Math.min(prev + 1, modalImages.length - 1));
  const handlePrev = () => setCurrentImage(prev => Math.max(prev - 1, 0));
  const formatUrl = (url: string) => {
    const parts = url.split('/');
    return `${parts[parts.length - 2]}, ${parts[parts.length - 1].replace('.jpg', '')}`;
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    navigate(newValue);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-200">
      {/* Header with Tabs and Language Buttons */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #3b82f6 30%, #8b5cf6 60%, #ec4899 90%)',
          color: '#ffffff',
          p: { xs: '0.5rem', sm: '0.5rem 1rem' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <Typography
          variant="h5"
          component="div"
          sx={{
            fontWeight: 'bold',
            textAlign: 'left',
            marginLeft: { xs: 0, sm: '1rem' },
            color: 'white',
            cursor: 'pointer',
            '&:hover': { color: '#d1d5db' },
            fontSize: {
              xs: i18n.language === 'vi' ? '0.875rem' : '1rem', // Smaller font size for Vietnamese on mobile
              sm: '1.5rem',
            },
            mb: { xs: '0.5rem', sm: 0 },
          }}
          onClick={() => navigate('/')}
        >
          {t('name')}
        </Typography>

        <Tabs
          value={location.pathname}
          onChange={handleTabChange}
          textColor="inherit"
          indicatorColor="secondary"
          sx={{
            '.MuiTab-root': {
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              padding: { xs: '6px 8px', sm: '12px 16px' },
              minWidth: { xs: '60px', sm: '80px' },
            },
          }}
        >
          {/* <Tab label={t('news')} value="/dashboard" /> */}
          <Tab label={t('lessons')} value="/baigiang" />
          <Tab label={t('school')} value="/trongtruong" />
          <Tab label={t('upload')} value="/upload" />
        </Tabs>

        <Box sx={{ display: 'flex', gap: '0.5rem', mt: { xs: '0.5rem', sm: 0 } }}>
          <IconButton
            onClick={() => { i18n.changeLanguage('vi'); localStorage.setItem('language', 'vi'); }}
            sx={{
              border: i18n.language === 'vi' ? '2px solid #ffffff' : '2px solid transparent',
              borderRadius: '50%',
              p: 0.5,
              backgroundColor: i18n.language === 'vi' ? 'rgba(255,255,255,0.2)' : 'transparent',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
            }}
            aria-label="Vietnamese"
          >
            <img src="vietnam.png" alt="Vietnamese" style={{ width: 24, height: 24 }} />
          </IconButton>
          <IconButton
            onClick={() => { i18n.changeLanguage('en'); localStorage.setItem('language', 'en'); }}
            sx={{
              border: i18n.language === 'en' ? '2px solid #ffffff' : '2px solid transparent',
              borderRadius: '50%',
              p: 0.5,
              backgroundColor: i18n.language === 'en' ? 'rgba(255,255,255,0.2)' : 'transparent',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
            }}
            aria-label="English"
          >
            <img src="united-kingdom.png" alt="English" style={{ width: 24, height: 24 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Search Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: { xs: '0.5rem', sm: '1rem' },
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: '0.5rem', sm: '1rem' },
        }}
      >
        <TextField
          multiline
          rows={2}
          value={searchText}
          onChange={handleChange}
          placeholder={listening ? t('listening') : t('place_holder_search')}
          sx={{
            flexGrow: 1,
            width: { xs: '100%', sm: 'auto' },
          }}
        />
        <Box sx={{ display: 'flex', gap: '0.5rem', width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'space-between', sm: 'flex-start' } }}>
          <IconButton
            onClick={startListening}
            color="primary"
            sx={{ animation: listening ? 'blinker 1s linear infinite' : 'none' }}
          >
            <MicIcon />
          </IconButton>
          <Button
            size="large"
            color="warning"
            variant="contained"
            onClick={handleOCR}
            sx={{
              width: { xs: '150px', sm: '150px' },
              fontWeight: 'bold',
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
            }}
          >
            {t('search')}
          </Button>
        </Box>
      </Box>

      {/* Loading & Result Count */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}
      {!loading && resultCount !== null && (
        <Box sx={{ textAlign: 'center', my: 1 }}>
          {resultCount > 0 ? (
            <Typography variant="subtitle1" sx={{ color: 'green', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              {`${t('found')} ${resultCount} ${t('results')}`}
            </Typography>
          ) : (
            <Typography variant="subtitle1" sx={{ color: 'red', fontSize: { xs: '0.875rem', sm: '1rem' } }}>
              {t('no_matching_event')}
            </Typography>
          )}
        </Box>
      )}

      {/* Image Grid */}
      <div className="flex justify-center flex-grow overflow-y-auto">
        <Box className="p-6" sx={{ p: { xs: '1rem', sm: '2rem' } }}>
          <Box
            className="grid gap-x-10 gap-y-10"
            sx={{
              gridTemplateColumns: {
                xs: 'repeat(1, minmax(0, 1fr))',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(3, minmax(0, 1fr))',
                lg: 'repeat(5, minmax(0, 1fr))',
              },
            }}
          >
            {ocrImages.map((item, index) => (
              <Box
                key={index}
                className="relative"
                sx={{
                  maxWidth: { xs: '250px', sm: '250px' }, // Responsive maxWidth
                  mx: 'auto', // Center the image in the grid cell
                }}
              >
                <img
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.25)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)';
                  }}
                  src={`assets/V008/${item.index}.jpg`}
                  alt={`Hình ảnh ${item.vxxx}_${item.index}`}
                  className="object-cover cursor-pointer rounded-lg shadow-lg"
                  style={{
                    width: '100%',
                    height: 'auto',
                    aspectRatio: '4/3',
                    transition: 'transform 0.3s ease-in-out',
                  }}
                  onClick={() => handleOcrImageClick(index)}
                />
              </Box>
            ))}
          </Box>
        </Box>
      </div>

      {/* Modal */}
      <DetailImageModal
        open={open}
        handleClose={handleClose}
        currentImage={currentImage}
        handleNext={handleNext}
        handlePrev={handlePrev}
        selectedUrls={[]}
        formatUrl={formatUrl}
        modalImages={modalImages}
        idCurrentImage={idCurrentImage}
      />

      <style>{`
        @keyframes blinker {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default TrongTruong;