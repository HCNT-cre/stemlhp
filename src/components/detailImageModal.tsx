import React, { useEffect, useState, useRef } from 'react';
import { Modal, Box, Button } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
// File URL L13
import frame_url from '../assets/frame_url.txt';
// File URL OCR
import ocr_url from '../assets/frame_url_ocr.txt';
import { useTranslation } from 'react-i18next';

interface DetailImageModalProps {
  open: boolean;
  handleClose: () => void;
  modalImages: string[];
  currentImage: number;
  handlePrev: () => void;
  handleNext: () => void;
  selectedUrls: string[];
  formatUrl: (url: string) => string;
  idCurrentImage: number;
}

const DetailImageModal: React.FC<DetailImageModalProps> = ({
  open,
  handleClose,
  modalImages,
  currentImage,
  handlePrev,
  handleNext,
  idCurrentImage,
}) => {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [showVideo, setShowVideo] = useState(false);
  const [_fps, setFps] = useState<number>(25);
  const neighborListRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // Hàm parse link YouTube
  const parseYoutubeId = (youtubeLink: string): string => {
    try {
      const urlObj = new URL(youtubeLink);
      if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1); // bỏ dấu '/'
      } else {
        return urlObj.searchParams.get('v') || '';
      }
    } catch (err) {
      console.error('Invalid YouTube URL:', youtubeLink, err);
      return '';
    }
  };

  useEffect(() => {
    console.log("DetailImageModal - useEffect triggered");
    console.log("modalImages:", modalImages);
    console.log("currentImage:", currentImage);
    console.log("idCurrentImage (from DB):", idCurrentImage);

    if (!modalImages || modalImages.length === 0) return;
    const currentItem = modalImages[currentImage];
    console.log("currentItem:", currentItem);

    let isOcr = false;
    let lineKey = '';
    let indexNumber = 0;

    // Kiểm tra dạng OCR ("Vxxx_index") hay L13
    const ocrMatch = currentItem.match(/^V\d{3}_\d+$/);
    if (ocrMatch) {
      isOcr = true;
      const [vxxx, idx] = currentItem.split('_');
      lineKey = vxxx; // ví dụ: "V005"
      indexNumber = parseInt(idx, 10);
      console.log("OCR mode => lineKey:", lineKey, "indexNumber:", indexNumber);
    } else {
      // L13 mode
      if (currentItem.indexOf('/') !== -1) {
        // Định dạng "L13/L13_V001/90"
        const parts = currentItem.split('/');
        lineKey = parts[1]; // "L13_V001"
        indexNumber = parseInt(parts[2], 10);
        console.log("L13 mode (/ format) => lineKey:", lineKey, "indexNumber:", indexNumber);
      } else {
        // Định dạng "L13_V027_14618"
        const parts = currentItem.split('_');
        if (parts.length >= 3) {
          lineKey = `${parts[0]}_${parts[1]}`; // "L13_V027"
          indexNumber = parseInt(parts[2], 10);  // 14618
          console.log("L13 mode (underscore format) => lineKey:", lineKey, "indexNumber:", indexNumber);
        } else {
          // fallback
          lineKey = "L13";
          indexNumber = idCurrentImage;
          console.log("Fallback L13 mode => lineKey:", lineKey, "indexNumber:", indexNumber);
        }
      }
    }

    // Chọn file URL
    const fileToFetch = isOcr ? ocr_url : frame_url;
    console.log("Fetch from:", fileToFetch);

    fetch(fileToFetch)
      .then(response => response.text())
      .then(data => {
        const lines = data.split('\n').map(line => line.trim()).filter(Boolean);
        console.log("Lines in file:", lines);

        // Tìm dòng bắt đầu bằng lineKey
        const foundLine = lines.find(line => line.startsWith(lineKey));
        console.log("foundLine for key", lineKey, ":", foundLine);

        if (!foundLine) {
          setVideoUrl('');
          setFps(25);
          return;
        }
        const parts = foundLine.split(' ');
        console.log("Parsed parts from foundLine:", parts);

        const youtubeLink = parts[1];
        const parsedFps = parseFloat(parts[2]) || 25;
        setFps(parsedFps);
        console.log("youtubeLink:", youtubeLink, "parsedFps:", parsedFps);

        // Tách ID (kể cả trường hợp youtu.be)
        const videoId = parseYoutubeId(youtubeLink);
        console.log("videoId:", videoId);

        // Tính thời gian bắt đầu
        const startTime = Math.floor((indexNumber + 25) / parsedFps);
        console.log("Calculated startTime:", startTime);

        // Tạo embedUrl
        const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${startTime}&autoplay=1`;
        console.log("embedUrl:", embedUrl);
        setVideoUrl(embedUrl);
      })
      .catch(err => console.error('Error reading file URL:', err));
  }, [currentImage, modalImages, idCurrentImage]);

  useEffect(() => {
    if (open && neighborListRef.current) {
      const selectedNeighbor = neighborListRef.current?.querySelector(`.neighbor-${currentImage}`);
      if (selectedNeighbor) {
        (selectedNeighbor as HTMLElement).scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [currentImage, open]);

  const handleLoadVideo = () => {
    setShowVideo(!showVideo);
  };

  const handleModalNext = () => {
    setShowVideo(false);
    handleNext();
  };

  const handleModalPrev = () => {
    setShowVideo(false);
    handlePrev();
  };

  const handleModalClose = () => {
    setShowVideo(false);
    handleClose();
  };

  let imageSrc = '';
  if (modalImages && modalImages.length > 0) {
    const currentItem = modalImages[currentImage];
    console.log("For image display, currentItem:", currentItem);

    // Kiểm tra dạng OCR hay L13 để xác định path ảnh
    const ocrMatch = currentItem.match(/^V\d{3}_\d+$/);
    if (ocrMatch) {
      const [vxxx, idx] = currentItem.split('_');
      imageSrc = `assets/${vxxx}/${idx}.jpg`;
    } else {
      // L13
      imageSrc = `assets/L13/${idCurrentImage.toString().padStart(3, '0')}.jpg`;
    }
    console.log("Final imageSrc:", imageSrc);
  }

  return (
    <Modal open={open} onClose={handleModalClose}>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: '80%', md: '900px' }, // Responsive width
          bgcolor: '#f0f0f0',
          p: { xs: 2, sm: 3, md: 4 }, // Responsive padding
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column', // Stack content vertically
          gap: { xs: 2, sm: 3 }, // Responsive gap
          maxHeight: '90vh', // Prevent overflow on small screens
          overflowY: 'auto', // Allow scrolling if content overflows
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {modalImages.length > 0 && (
            <>
              {showVideo ? (
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    paddingTop: { xs: '56.25%', sm: '56.25%' }, // 16:9 aspect ratio (height = 56.25% of width)
                  }}
                >
                  <iframe
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                    }}
                    src={videoUrl}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="YouTube Player"
                  ></iframe>
                </Box>
              ) : (
                <img
                  src={imageSrc}
                  alt={`Hình ảnh ${modalImages[currentImage]}`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    // maxHeight: { xs: '300px', sm: '400px', md: '450px' }, // Responsive max height
                    objectFit: 'contain',
                  }}
                />
              )}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' }, // Stack buttons vertically on mobile
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mt: { xs: 2, sm: 4 }, // Responsive margin-top
                  width: '100%',
                  gap: { xs: 1, sm: 2 }, // Responsive gap between buttons
                }}
              >
                <Button
                  onClick={handleModalPrev}
                  disabled={currentImage === 0}
                  sx={{
                    minWidth: { xs: '40px', sm: '48px' }, // Smaller button on mobile
                    p: { xs: '6px', sm: '8px' }, // Responsive padding
                  }}
                >
                  <ArrowBackIosNewIcon fontSize="small" />
                </Button>
                <Button
                  variant="contained"
                  onClick={handleLoadVideo}
                  color="primary"
                  sx={{
                    fontSize: { xs: '0.75rem', sm: '0.875rem' }, // Smaller font on mobile
                    px: { xs: 2, sm: 3 }, // Responsive padding
                    py: { xs: 0.5, sm: 1 },
                  }}
                >
                  {showVideo ? t('back_to_frame') : t('play')}
                </Button>
                <Button
                  onClick={handleModalNext}
                  disabled={currentImage === modalImages.length - 1}
                  sx={{
                    minWidth: { xs: '40px', sm: '48px' }, // Smaller button on mobile
                    p: { xs: '6px', sm: '8px' }, // Responsive padding
                  }}
                >
                  <ArrowForwardIosIcon fontSize="small" />
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Modal>
  );
};

export default DetailImageModal;