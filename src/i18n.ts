import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          name: "VIDEO RETRIEVAL SYSTEM",
          select_language: "Select your preferred language",
          search: "Search",
          play: "Play video",
          positive: "Positive search",
          place_holder_search: "Enter your search query here...",
          back_to_frame: "Back to frame",
          lesson: "Course",
          security: "School security",
          listening: "Listening...",
          no_matching_event: "No matching set found",
          found: "Found",
          results: "results",
          no_exact_match: "No exact match",
          showing_related: "Showing related",
          news: "News",
          lessons: "Lessons",
          school: "School",
          class: "Class",
          upload: "Upload",
          upload_video: "Upload Video",
          drag_drop_or_click: "Drag and drop or click to select",
          choose_file: "Choose File",
          file_selected: "File Selected",
          processing: "Processing...",
          cancel: "Cancel",
          uploaded_videos: "Uploaded Videos",
          no_videos: "No videos uploaded yet",
          extracting_keyframes: "Extracting keyframes...",
          extracting_context: "Extracting context...",
          processing_results: "Processing results...",
          video_exists: "This video already exists in the system!",
          upload_more: "Upload More Videos",
          delete_video: "Delete",
          no_videos_uploaded: "No videos have been uploaded yet!",
        },
      },
      vi: {
        translation: {
          name: "PHẦN MỀM TÌM KIẾM VÀ TRUY XUẤT NỘI DUNG VIDEO",
          select_language: "Chọn ngôn ngữ bạn muốn sử dụng",
          search: "Tìm kiếm",
          play: "Xem video",
          positive: "Tìm kiếm liên quan",
          place_holder_search: "Nhập thông tin cần tìm kiếm...",
          back_to_frame: "Trở lại hình ảnh",
          lesson: "Tìm kiếm bài giảng",
          security: "Tìm kiếm trong trường",
          listening: "Đang lắng nghe...",
          no_matching_event: "Không tìm thấy kết quả phù hợp",
          found: "Tìm thấy",
          results: "kết quả",
          no_exact_match: "Không tìm thấy kết quả chính xác",
          showing_related: "Hiển thị các kết quả liên quan: ",
          news: "Tin tức",
          lessons: "Bài giảng",
          school: "Trường học",
          class: "Lớp",
          upload: "TẢI VIDEO LÊN",
          upload_video: "Tải video lên",
          drag_drop_or_click: "Kéo và thả hoặc nhấn để chọn",
          choose_file: "Chọn video",
          file_selected: "Video đã chọn",
          processing: "Đang xử lý...",
          cancel: "Hủy",
          uploaded_videos: "Danh sách video đã tải lên",
          no_videos: "Chưa có video nào được tải lên",
          extracting_keyframes: "Đang trích xuất keyframe...",
          extracting_context: "Đang trích xuất nội dung...",
          processing_results: "Đang xử lý kết quả...",
          video_exists: "Video này đã có trên hệ thống!",
          upload_more: "Tải thêm video",
          delete_video: "Xóa",
          no_videos_uploaded: "Chưa có video nào được tải lên!",
        },
      },
    },
    lng: 'vi',
    fallbackLng: 'vi',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;