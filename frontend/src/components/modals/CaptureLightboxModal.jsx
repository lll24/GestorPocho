import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUrl';

export default function CaptureLightboxModal({ selectedCapture, onClose }) {
  const [zoomScale, setZoomScale] = useState(1);

  useEffect(() => {
    setZoomScale(1);
  }, [selectedCapture]);

  if (!selectedCapture) return null;

  return (
    <div className="modal-backdrop">
      <div className="card modal-card" style={{ maxWidth: '850px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <h3 style={{ margin: 0 }}>Comprobante de Pago</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => setZoomScale(prev => Math.max(prev - 0.25, 0.5))}
              title="Alejar"
            >
              <ZoomOut size={16} />
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: '45px', textAlign: 'center' }}>
              {Math.round(zoomScale * 100)}%
            </span>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={() => setZoomScale(prev => Math.min(prev + 0.25, 3))}
              title="Acercar"
            >
              <ZoomIn size={16} />
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              onClick={() => setZoomScale(1)}
            >
              100%
            </button>
          </div>
        </div>

        <div style={{ 
          width: '100%', 
          height: '55vh', 
          overflow: 'auto', 
          background: 'rgba(0,0,0,0.4)', 
          borderRadius: '8px', 
          border: '1px solid var(--border-color)', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          position: 'relative'
        }}>
          <div style={{ 
            transform: `scale(${zoomScale})`, 
            transition: 'transform 0.15s ease-out', 
            transformOrigin: 'center center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img 
              src={getImageUrl(selectedCapture)} 
              alt="Comprobante de Pago" 
              style={{ maxWidth: '90%', maxHeight: '50vh', borderRadius: '4px', display: 'block', objectFit: 'contain' }} 
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
          <button className="btn btn-primary" style={{ flex: 1, padding: '12px' }} onClick={onClose}>
            Cerrar Vista
          </button>
        </div>
      </div>
    </div>
  );
}
