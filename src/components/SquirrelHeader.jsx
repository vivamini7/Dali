import { motion } from 'framer-motion'

/* 뛰는 동작: 위아래 통통 + 앞뒤 기울기 */
const runVariants = {
  animate: {
    y:       [0, -6, 0, -5, 0, -6, 0],
    rotate:  [0, -4, 0, -3, 0, -4, 0],
    scaleY:  [1, 1.06, 0.96, 1.05, 0.97, 1.06, 1],
  },
}

export default function SquirrelHeader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%', overflow: 'hidden' }}>

      {/* 다람쥐: 왼쪽 → 오른쪽으로 뛰어가며 사라짐 */}
      <motion.div
        style={{ position: 'absolute', left: 0, originY: 1 }}
        initial={{ x: -60 }}
        animate={{ x: 'calc(100vw + 60px)' }}
        transition={{ duration: 4.1, ease: [0.15, 0, 0.45, 1], delay: 0.2 }}
      >
        <motion.img
          src="/logo-back.png"
          alt=""
          aria-hidden="true"
          style={{ width: 52, height: 52, objectFit: 'contain', display: 'block', transformOrigin: 'bottom center' }}
          variants={runVariants}
          animate="animate"
          transition={{
            duration: 0.38,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.div>

      {/* Dalibaba 텍스트: 다람쥐 사라진 후 등장 */}
      <motion.div
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut', delay: 0.8 }}
      >
        <span style={{
          fontSize: '1.05rem', fontWeight: 900,
          color: 'var(--brown)', letterSpacing: '-.3px'
        }}>
          Dalibaba
        </span>
        <span style={{
          fontSize: '.52rem', background: 'var(--amber)', color: '#fff',
          borderRadius: 9999, padding: '2px 5px',
          fontWeight: 700, letterSpacing: '.4px',
          alignSelf: 'flex-start', marginTop: 1
        }}>
          BETA
        </span>
      </motion.div>

    </div>
  )
}
