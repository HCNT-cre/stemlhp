import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, Box, Typography, Card, CardContent } from '@mui/material';

const LanguageSelector: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Lấy ngôn ngữ từ localStorage và tự động điều hướng nếu có
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
      navigate('/baigiang');
    }
  }, [i18n, navigate]);

  // Hàm thay đổi ngôn ngữ và lưu vào localStorage
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng); // Lưu ngôn ngữ vào localStorage
    navigate('/baigiang');
  };

  return (
    <Box
      className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 animate-fadeIn"
    >
      <Card
        className="shadow-2xl rounded-lg transform transition-transform duration-500 hover:scale-110"
        sx={{
          maxWidth: 1000,
          textAlign: 'center',
          padding: 2,
        }}
      >
        <CardContent>
          {/* Tiêu đề */}
          <Typography
            variant="h4"
            className="font-bold text-gray-800"
            sx={{
              padding: '16px',
              textShadow: '0px 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            {t('name')}
          </Typography>
          {/* Mô tả */}
          <Typography
            variant="body1"
            className="text-gray-600"
            sx={{
              paddingBottom: 3,
              fontSize: '1.1rem',
            }}
          >
            {t('select_language')}
          </Typography>
          {/* Các nút */}
          <Box className="space-y-4">
            <Button
              variant="contained"
              className="w-[51%] bg-blue-500 hover:bg-blue-600 text-white shadow-md transform transition-transform duration-300 hover:scale-105"
              onClick={() => changeLanguage('en')}
              sx={{
                borderRadius: '25px',
                fontSize: '1rem',
              }}
            >
              Tiếng Anh
            </Button>
            <Button
              variant="contained"
              className="w-[51%] bg-green-500 hover:bg-green-600 text-white shadow-md transform transition-transform duration-300 hover:scale-105"
              onClick={() => changeLanguage('vi')}
              sx={{
                borderRadius: '25px',
                fontSize: '1rem',
              }}
            >
              Tiếng Việt
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LanguageSelector;
