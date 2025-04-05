import React, { useState } from 'react';
import {
  Box, Typography, Tabs, Tab, IconButton, Button
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Upload: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // State để lưu file được chọn
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Xử lý khi chọn file từ input
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Xử lý khi kéo file vào khu vực drop
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  // Xử lý khi rời khỏi khu vực drop
  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  // Xử lý khi thả file
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Xử lý chuyển Tab (điều hướng)
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    navigate(newValue);
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

      {/* Khu vực Upload */}
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
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              fontSize: { xs: '1rem', sm: '1.25rem' },
            }}
          >
            {t('upload_video')}
          </Typography>

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

          <Button
            variant="contained"
            component="label"
            color="primary"
            sx={{
              mb: 2,
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
    </div>
  );
};

export default Upload;