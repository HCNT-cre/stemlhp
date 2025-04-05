import React, { useState, useEffect } from 'react';
import {
  Button, IconButton, TextField, Typography, CircularProgress,
  Tabs, Tab, Box, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import DetailImageModal from '../components/detailImageModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import OpenAI from 'openai';

// Import các file OCR
import ocr_004 from '../assets/ocr_004.txt';
import ocr_005 from '../assets/ocr_005.txt';
import ocr_006 from '../assets/ocr_006.txt';
import ocr_007 from '../assets/ocr_007.txt';

interface OCRImageType {
  vxxx: string;  // ví dụ: "V004"
  index: number; // ví dụ: 123
}

// Map lớp -> file OCR
const classToFileMap: Record<number, string> = {
  6: ocr_004,
  7: ocr_005,
  8: ocr_006,
  9: ocr_007,
};

// Map lớp -> tên thư mục
const classToFolderMap: Record<number, string> = {
  6: 'V004',
  7: 'V005',
  8: 'V006',
  9: 'V007',
};

// Initialize OpenAI client (WARNING: This exposes the API key in the frontend)
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // This is for demo purposes; move to backend in production
});

const BaiGiang: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // State chọn lớp, mặc định là lớp 6
  const [selectedClass, setSelectedClass] = useState<number>(6);

  // State cho ảnh OCR
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

  // State to store precomputed embeddings for the selected class
  const [ocrEmbeddings, setOcrEmbeddings] = useState<any[]>([]);
  const [cachedEmbeddings, setCachedEmbeddings] = useState<Record<number, any[]>>({});

  // Precompute embeddings whenever the selected class changes
  useEffect(() => {
    const loadOcrDataAndEmbeddings = async () => {
      setLoading(true);
      try {
        // Check if embeddings for this class are already cached
        if (cachedEmbeddings[selectedClass]) {
          setOcrEmbeddings(cachedEmbeddings[selectedClass]);
          setLoading(false);
          return;
        }

        // Fetch the OCR file for the selected class
        const selectedFile = classToFileMap[selectedClass];
        const response = await fetch(selectedFile);
        const text = await response.text();
        const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

        const ocrData = lines.map(line => {
          const beforeColon = line.split(':')[0];
          const [vxxx, idx] = beforeColon.split('_');
          return {
            content: line.split(':')[1].trim(),
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
        // Cache the embeddings
        setCachedEmbeddings(prev => ({ ...prev, [selectedClass]: embeddings }));
      } catch (error) {
        console.error('Error generating embeddings for OCR data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOcrDataAndEmbeddings();
  }, [selectedClass]);

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
        .filter(item => item.similarity > 0.8) // Adjust threshold as needed
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

  // Xử lý chuyển Tab (điều hướng)
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    navigate(newValue);
  };

  // Xử lý chọn lớp
  const handleClassChange = (event: any) => {
    const newClass = event.target.value as number;
    setSelectedClass(newClass);
    // Reset kết quả tìm kiếm khi đổi lớp
    setOcrImages([]);
    setResultCount(null);
  };

  // Thay đổi nội dung ô input
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  };

  // Xử lý click ảnh OCR để mở modal
  const handleOcrImageClick = (index: number) => {
    const allOcrUrls = ocrImages.map(item => `${item.vxxx}_${item.index}`);
    console.log("Clicked OCR image:", ocrImages[index]);
    setModalImages(allOcrUrls);
    setCurrentImage(index);
    setIdCurrentImage(0);
    setOpen(true);
  };

  // Tìm kiếm bằng giọng nói
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

  // Xử lý modal
  const handleClose = () => setOpen(false);
  const handleNext = () => setCurrentImage(prev => Math.min(prev + 1, modalImages.length - 1));
  const handlePrev = () => setCurrentImage(prev => Math.max(prev - 1, 0));

  // formatUrl (nếu cần)
  const formatUrl = (url: string) => {
    const parts = url.split('/');
    return `${parts[parts.length - 2]}, ${parts[parts.length - 1].replace('.jpg', '')}`;
  };

  return (
    <div className="h-screen flex flex-col bg-gray-200">
      {/* Header với Tabs và icon ngôn ngữ */}
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
            whiteSpace: 'nowrap', // Prevent wrapping
          }}
          onClick={() => navigate('/baigiang')}
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

      {/* Thanh tìm kiếm + Select chọn lớp */}
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
        {/* Select chọn lớp */}
        <FormControl sx={{ width: { xs: '100%', sm: 120 } }}>
          <InputLabel id="select-class-label">{t('class')}</InputLabel>
          <Select
            labelId="select-class-label"
            value={selectedClass}
            label="Lớp"
            onChange={handleClassChange}
          >
            <MenuItem value={6}>{t('class')} 6</MenuItem>
            <MenuItem value={7}>{t('class')} 7</MenuItem>
            <MenuItem value={8}>{t('class')} 8</MenuItem>
            <MenuItem value={9}>{t('class')} 9</MenuItem>
          </Select>
        </FormControl>

        {/* Ô nhập tìm kiếm */}
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

        {/* Mic button and Search button */}
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

      {/* Hiển thị loading & số kết quả */}
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

      {/* Lưới ảnh OCR */}
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
            {ocrImages.map((item, index) => {
              const folder = classToFolderMap[selectedClass];
              return (
                <Box
                  key={index}
                  className="relative"
                  sx={{
                    maxWidth: { xs: '150px', sm: '200px' },
                    mx: 'auto',
                  }}
                >
                  <img
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.25)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)';
                    }}
                    src={`assets/${folder}/${item.index}.jpg`}
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
              );
            })}
          </Box>
        </Box>
      </div>

      {/* Modal xem chi tiết ảnh */}
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

export default BaiGiang;