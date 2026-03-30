import { useNavigate } from 'react-router-dom';

const MyCoolErrorPage = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.body}>
      <style>
        {`
          @keyframes drive-in {
            from { transform: translateX(-300px); }
            to { transform: translateX(0) translateY(0); }
          }
          @keyframes wheel-rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes show-driver {
            to { opacity: 1; }
          }
          @keyframes show-text {
            to { opacity: 1; }
          }
        `}
      </style>

      <div style={styles.truck}>
        <div style={{ ...styles.wheel, ...styles.wheel1 }}></div>
        <div style={{ ...styles.wheel, ...styles.wheel2 }}></div>
        <div style={styles.package}>พัสดุหน้าเว็บ</div>
        <img 
          style={styles.driver} 
          src="https://cdn-icons-png.flaticon.com/512/101/101621.png" 
          alt="คนขับ" 
        />
      </div>

      <h1 style={styles.text404}>404! หาไม่เจอค่ะ</h1>
      <p style={styles.desc}>รถขนส่งพัสดุของคุณหลงทาง เดี๋ยวพากลับไปหน้าแรกเลย</p>
      
      <button 
        style={styles.backBtn} 
        onClick={() => navigate('/')}
      >
        กลับไปหน้าแรก
      </button>
    </div>
  );
};

// แปลง CSS เป็น JS Styles (หรือคุณจะเอาไปใส่ใน index.css ก็ได้ครับ)
const styles: { [key: string]: React.CSSProperties } = {
  body: {
    backgroundColor: '#CAF0F8',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    fontFamily: "'Sarabun', sans-serif",
  },
  truck: {
    width: '200px',
    height: '100px',
    backgroundColor: '#B5EAD7',
    borderRadius: '10px 20px 10px 10px',
    position: 'relative',
    animation: 'drive-in 2s ease-out forwards',
    marginBottom: '50px',
  },
  wheel: {
    width: '30px',
    height: '30px',
    backgroundColor: '#333',
    borderRadius: '50%',
    position: 'absolute',
    bottom: '-15px',
    animation: 'wheel-rotate 0.5s linear infinite',
  },
  wheel1: { left: '30px' },
  wheel2: { left: '140px' },
  driver: {
    position: 'absolute',
    width: '30px',
    height: '35px',
    top: '20px',
    left: '130px',
    opacity: 0,
    animation: 'show-driver 1s ease-out 3s forwards',
  },
  package: {
    position: 'absolute',
    width: '80px',
    height: '70px',
    backgroundColor: '#FFD6DA',
    top: '15px',
    left: '15px',
    borderRadius: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#333',
    fontWeight: 'bold',
  },
  text404: {
    fontSize: '3rem',
    color: '#C7CEEA',
    opacity: 0,
    animation: 'show-text 1s ease-out 4s forwards', // ปรับเวลาให้เร็วขึ้นนิดนึง
    marginBottom: '20px',
  },
  desc: {
    fontSize: '1.2rem',
    color: '#555',
    opacity: 0,
    animation: 'show-text 1s ease-out 5s forwards',
    marginBottom: '30px',
  },
  backBtn: {
    padding: '12px 24px',
    backgroundColor: '#C7CEEA',
    border: 'none',
    borderRadius: '25px',
    fontSize: '1.1rem',
    color: '#333',
    cursor: 'pointer',
    opacity: 0,
    animation: 'show-text 1s ease-out 6s forwards',
    transition: 'transform 0.3s',
  },
};

export default MyCoolErrorPage;