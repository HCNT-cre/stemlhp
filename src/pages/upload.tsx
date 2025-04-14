import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, IconButton, Button, CircularProgress,
  TextField, LinearProgress, Alert,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import DeleteIcon from '@mui/icons-material/Delete';
import DetailImageModal from '../components/detailImageModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import OpenAI from 'openai';

// File OCR cho tìm kiếm
import ocr_009 from '../assets/ocr_009.txt';

interface OCRImageType {
  vxxx: string; // ví dụ: "V009"
  index: number; // ví dụ: 123
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const SearchBar: React.FC<{
  searchText: string;
  setSearchText: (text: string) => void;
  onSearch: () => void;
  listening: boolean;
  startListening: () => void;
}> = ({ searchText, setSearchText, onSearch, listening, startListening }) => {
  const { t } = useTranslation();
  return (
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
        onChange={(e) => setSearchText(e.target.value)}
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
          onClick={onSearch}
          sx={{
            width: { xs: '150px', sm: '150px' },
            fontWeight: 'bold',
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
          }}
        >
          {t('search')}
        </Button>
      </Box>
      <style>{`
        @keyframes blinker {
          50% { opacity: 0; }
        }
      `}</style>
    </Box>
  );
};

const Upload: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadedVideos, setUploadedVideos] = useState<string[]>(() => {
    const saved = localStorage.getItem('uploadedVideos');
    return saved ? JSON.parse(saved) : [];
  });
  const [hasV009, setHasV009] = useState<boolean>(() => {
    return localStorage.getItem('hasV009') === 'true';
  });
  const [processing, setProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState<boolean>(false);

  // Search states
  const [searchText, setSearchText] = useState<string>('');
  const [listening, setListening] = useState<boolean>(false);
  const [ocrImages, setOcrImages] = useState<OCRImageType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [resultCount, setResultCount] = useState<number | null>(null);
  const [ocrEmbeddings, setOcrEmbeddings] = useState<any[]>([]);
  const [open, setOpen] = useState<boolean>(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [currentImage, setCurrentImage] = useState<number>(0);
  const [idCurrentImage, setIdCurrentImage] = useState<number>(0);

  // Load OCR embeddings
  useEffect(() => {
    const loadOcrDataAndEmbeddings = async () => {
      try {
        const response = await fetch(ocr_009);
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

    if (hasV009) {
      loadOcrDataAndEmbeddings();
    }
  }, [hasV009]);

  // Save uploadedVideos to localStorage
  useEffect(() => {
    localStorage.setItem('uploadedVideos', JSON.stringify(uploadedVideos));
    localStorage.setItem('hasV009', hasV009.toString());
  }, [uploadedVideos, hasV009]);

  // Xử lý tiến độ xử lý
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (processing && selectedFile) {
      const isV009 = selectedFile.name === 'V009.mp4';
      const totalTime = isV009 ? 60 * 1000 : 10 * 60 * 1000;
      const increment = 100 / (totalTime / 100);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval!);
            setProcessing(false);
            setUploadedVideos((prevVideos) => {
              const newVideos = [...prevVideos, selectedFile!.name];
              localStorage.setItem('uploadedVideos', JSON.stringify(newVideos));
              return newVideos;
            });
            if (isV009) {
              setHasV009(true);
            }
            setSelectedFile(null);
            setShowUpload(false); // Quay lại giao diện tìm kiếm sau khi upload xong
            return 100;
          }
          return prev + increment;
        });
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [processing, selectedFile]);

  // Xử lý khi chọn file
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name === 'V009.mp4' && hasV009) {
        setError(t('video_exists'));
        setTimeout(() => setError(null), 3000);
        return;
      }
      setSelectedFile(file);
      setProgress(0);
      setProcessing(true);
    }
  };

  // Xử lý kéo thả
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      if (file.name === 'V009.mp4' && hasV009) {
        setError(t('video_exists'));
        setTimeout(() => setError(null), 3000);
        return;
      }
      setSelectedFile(file);
      setProgress(0);
      setProcessing(true);
    }
  };

  // Xử lý xóa video
  const handleDeleteVideo = (video: string) => {
    const newVideos = uploadedVideos.filter((v) => v !== video);
    setUploadedVideos(newVideos);
    if (newVideos.length === 0 || !newVideos.includes('V009.mp4')) {
      setHasV009(false);
      localStorage.removeItem('uploadedVideos');
      localStorage.removeItem('hasV009');
    }
  };

  // Xử lý tìm kiếm
  const handleSearch = async () => {
    if (!searchText || ocrEmbeddings.length === 0) return;

    setLoading(true);
    try {
      let query = searchText;
      if (i18n.language === 'en') {
        const translationResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Translate the following English text to Vietnamese.' },
            { role: 'user', content: searchText },
          ],
        });
        query = translationResponse.choices[0].message.content || searchText;
      }

      const queryEmbeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: query,
      });
      const queryEmbedding = queryEmbeddingResponse.data[0].embedding;

      const results = ocrEmbeddings
        .map(item => ({
          ...item,
          similarity: cosineSimilarity(queryEmbedding, item.embedding),
        }))
        .filter(item => item.similarity > 0.8)
        .sort((a, b) => b.similarity - a.similarity);

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

  // Cosine similarity function
  const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  };

  // Xử lý click vào hình ảnh
  const handleOcrImageClick = (index: number) => {
    const allOcrUrls = ocrImages.map(item => `${item.vxxx}_${item.index}`);
    setModalImages(allOcrUrls);
    setCurrentImage(index);
    setIdCurrentImage(0);
    setOpen(true);
  };

  // Xử lý nhận diện giọng nói
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
  const formatUrl = (url: string) => {
    const parts = url.split('/');
    return `${parts[parts.length - 2]}, ${parts[parts.length - 1].replace('.jpg', '')}`;
  };

  // Xử lý điều hướng tab
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    navigate(newValue);
  };

  // Xử lý tiến độ giai đoạn
  const getProgressMessage = () => {
    if (progress <= 50) {
      return t('extracting_keyframes');
    } else if (progress <= 75) {
      return t('extracting_context');
    } else {
      return t('processing_results');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-200">
      {/* Header */}
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
              xs: i18n.language === 'vi' ? '0.875rem' : '1rem',
              sm: '1.5rem',
            },
            mb: { xs: '0.5rem', sm: 0 },
            whiteSpace: 'nowrap',
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

      {/* Nội dung chính */}
      {hasV009 && !showUpload && !processing ? (
        <Box sx={{ flexGrow: 1, display: 'flex', p: { xs: 2, sm: 4 } }}>
          {/* Cột trái: Danh sách video */}
          <Box
            sx={{
              width: { xs: '100%', sm: '30%' },
              maxWidth: '300px',
              p: 2,
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              mr: 2,
              overflowY: 'auto',
            }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>
              {t('uploaded_videos')}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mb: 2 }}
              onClick={() => setShowUpload(true)}
            >
              {t('upload_more')}
            </Button>
            {uploadedVideos.length > 0 ? (
              uploadedVideos.map((video, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ flexGrow: 1 }}>
                    {video}
                  </Typography>
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteVideo(video)}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('no_videos')}
              </Typography>
            )}
          </Box>

          {/* Bên phải: Tìm kiếm và kết quả */}
          <Box sx={{ flexGrow: 1 }}>
            <SearchBar
              searchText={searchText}
              setSearchText={setSearchText}
              onSearch={handleSearch}
              listening={listening}
              startListening={startListening}
            />
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
                        maxWidth: { xs: '250px', sm: '250px' },
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
                        src={`assets/V009/${item.index}.jpg`}
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
          </Box>
        </Box>
      ) : processing && selectedFile ? (
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: { xs: 2, sm: 4 },
          }}
        >
          <CircularProgress size={60} value={progress} variant="determinate" />
          <Typography
            variant="h6"
            sx={{
              mt: 2,
              fontSize: { xs: '1rem', sm: '1.25rem' },
            }}
          >
            {`${Math.round(progress)}% - ${getProgressMessage()}`}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              width: { xs: '80%', sm: '50%' },
              mt: 2,
              height: 10,
              borderRadius: 5,
            }}
          />
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setProcessing(false);
              setProgress(0);
              setSelectedFile(null);
              setShowUpload(false);
            }}
            sx={{
              mt: 3,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
            }}
          >
            {t('cancel')}
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: { xs: 2, sm: 4 },
          }}
        >
          <Box
            sx={{
              width: { xs: '100%', sm: '80%', md: '60%' },
              maxWidth: '600px',
              p: 4,
              border: '2px dashed',
              borderColor: dragActive ? 'primary.main' : 'grey.400',
              borderRadius: '12px',
              backgroundColor: 'white',
              textAlign: 'center',
              transition: 'border-color 0.3s ease',
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Typography
              variant="h6"
              sx={{
                mb: 2,
                fontSize: { xs: '1rem', sm: '1.25rem' },
              }}
            >
              {t('upload_video')}
            </Typography>
            {uploadedVideos.length === 0 && (
              <Typography
                variant="body1"
                sx={{
                  mb: 2,
                  color: 'grey.600',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                }}
              >
                {t('no_videos_uploaded')}
              </Typography>
            )}
            <Typography
              variant="body1"
              sx={{
                mb: 3,
                color: 'grey.600',
                fontSize: { xs: '0.875rem', sm: '1rem' },
              }}
            >
              {t('drag_drop_or_click')}
            </Typography>
            <Box sx={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Button
                variant="contained"
                component="label"
                color="primary"
                sx={{
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                  px: { xs: 3, sm: 4 },
                  py: { xs: 1, sm: 1.5 },
                }}
              >
                {t('choose_file')}
                <input
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={handleFileChange}
                />
              </Button>
              {hasV009 && (
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => setShowUpload(false)}
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    px: { xs: 3, sm: 4 },
                    py: { xs: 1, sm: 1.5 },
                  }}
                >
                  {t('cancel')}
                </Button>
              )}
            </Box>
            {selectedFile && (
              <Typography
                variant="body2"
                sx={{
                  mt: 2,
                  color: 'green',
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                }}
              >
                {t('file_selected')}: {selectedFile.name}
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </div>
  );
};

export default Upload;