(function() {
  // 1. Get the current script tag attributes to locate the clinicId
  const scriptTag = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const clinicId = scriptTag.getAttribute('data-clinic-id');
  if (!clinicId) {
    console.error('ClinicAI Widget Error: data-clinic-id attribute is missing from script tag.');
    return;
  }

  // 2. Define standard server configurations dynamically based on script loading source
  const scriptSrc = scriptTag.src;
  const scriptOrigin = new URL(scriptSrc).origin;
  
  // Default fallback: if running on port 5001 (dev backend), point to port 5173 (dev frontend)
  // Otherwise, use same scriptOrigin host (for production deployments where static files are unified or served together)
  const ASSISTANT_URL = scriptOrigin.includes('localhost:5001')
    ? 'http://localhost:5173/assistant-embed'
    : `${scriptOrigin}/assistant-embed`;

  // 3. Inject CSS styling rules for launcher and dialog elements
  const style = document.createElement('style');
  style.innerHTML = `
    .clinic-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
      font-family: system-ui, -apple-system, sans-serif;
    }
    
    .clinic-widget-launcher {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      border: none;
      outline: none;
    }
    
    .clinic-widget-launcher:hover {
      transform: scale(1.08) rotate(5deg);
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.5);
    }

    .clinic-widget-launcher:active {
      transform: scale(0.95);
    }
    
    .clinic-widget-launcher svg {
      width: 28px;
      height: 28px;
      fill: none;
      stroke: #ffffff;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: transform 0.3s ease;
    }
    
    .clinic-widget-iframe-wrapper {
      position: fixed;
      bottom: 92px;
      right: 20px;
      width: 400px;
      height: 620px;
      max-width: 90vw;
      max-height: 80vh;
      border-radius: 20px;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.15);
      border: 1px solid rgba(255, 255, 255, 0.08);
      z-index: 2147483646;
    }
    
    .clinic-widget-iframe-wrapper.opened {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    
    .clinic-widget-iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: #0b0f19;
    }
  `;
  document.head.appendChild(style);

  // 4. Create floating wrapper node
  const container = document.createElement('div');
  container.className = 'clinic-widget-container';
  document.body.appendChild(container);

  // 5. Create iframe dialog holder
  const iframeWrapper = document.createElement('div');
  iframeWrapper.className = 'clinic-widget-iframe-wrapper';
  
  const iframe = document.createElement('iframe');
  iframe.className = 'clinic-widget-iframe';
  iframe.src = `${ASSISTANT_URL}?clinicId=${encodeURIComponent(clinicId)}`;
  iframe.allow = "microphone; speech-synthesis"; // enable Web Speech permissions
  
  iframeWrapper.appendChild(iframe);
  container.appendChild(iframeWrapper);

  // 6. Create Floating Launcher bubble
  const launcher = document.createElement('button');
  launcher.className = 'clinic-widget-launcher';
  // Stethoscope and bubble vector icon inside launcher button
  launcher.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M4.5 16.5c-1.5 1.25-2.5 3-2.5 4.5h20c0-1.5-1-3.25-2.5-4.5" />
      <circle cx="12" cy="7" r="4" />
      <path d="M12 11v5" />
      <path d="M9 14h6" />
    </svg>
  `;
  container.appendChild(launcher);

  // 7. Toggle Open/Close logic
  let isOpen = false;
  launcher.addEventListener('click', function() {
    isOpen = !isOpen;
    if (isOpen) {
      iframeWrapper.classList.add('opened');
      launcher.querySelector('svg').style.transform = 'scale(0.85) rotate(90deg)';
      // Replace launcher SVG with closing X vector
      launcher.innerHTML = `
        <svg viewBox="0 0 24 24">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
    } else {
      iframeWrapper.classList.remove('opened');
      launcher.querySelector('svg').style.transform = 'scale(1) rotate(0deg)';
      // Restore initial stethoscope icon
      launcher.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M4.5 16.5c-1.5 1.25-2.5 3-2.5 4.5h20c0-1.5-1-3.25-2.5-4.5" />
          <circle cx="12" cy="7" r="4" />
          <path d="M12 11v5" />
          <path d="M9 14h6" />
        </svg>
      `;
    }
  });

})();
