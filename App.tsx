import { useState, useEffect } from 'react';
import { db } from './firebase'; // Nhập cái db vừa tạo
import { collection, getDocs } from 'firebase/firestore'; // Nhập hàm lấy dữ liệu

function App() {
  const [questions, setQuestions] = useState([]);

  // Hàm tải dữ liệu tự động khi mở web
  useEffect(() => {
    const getData = async () => {
      // Kết nối vào bộ sưu tập 'questions' trên Firebase
      const querySnapshot = await getDocs(collection(db, "questions"));
      
      // Chuyển dữ liệu về dạng danh sách
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setQuestions(data); // Lưu vào biến để hiển thị
    };

    getData();
  }, []);

  return (
    <div>
      {/* Hiển thị danh sách câu hỏi */}
      {questions.map((q, index) => (
        <div key={q.id}>
           <h3>Câu {index + 1}: {q.question}</h3> 
           {/* Hiển thị các đáp án... */}
        </div>
      ))}
    </div>
  );
}