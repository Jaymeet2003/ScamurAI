import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Button } from "../components/button";
import { Card } from "../components/card";
import { Container } from "../components/container";
import './landing.css';

const Landing = () => {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const starsRef = useRef([]);

  useEffect(() => {
    const initThree = () => {
      sceneRef.current = new THREE.Scene();
      cameraRef.current = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      cameraRef.current.position.z = 50;

      rendererRef.current = new THREE.WebGLRenderer({ alpha: true });
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      canvasRef.current.appendChild(rendererRef.current.domElement);

      const geometry = new THREE.SphereGeometry(0.1, 8, 8);
      const material = new THREE.MeshBasicMaterial({ color: 0x4F46E5 });

      for (let i = 0; i < 500; i++) {
        const star = new THREE.Mesh(geometry, material);
        const x = THREE.MathUtils.randFloatSpread(100);
        const y = THREE.MathUtils.randFloatSpread(100);
        const z = THREE.MathUtils.randFloatSpread(100);
        star.position.set(x, y, z);
        sceneRef.current.add(star);
        starsRef.current.push(star);
      }

      const animate = () => {
        requestAnimationFrame(animate);
        starsRef.current.forEach(star => {
          star.rotation.x += 0.005;
          star.rotation.y += 0.005;
        });
        cameraRef.current.position.x = Math.sin(Date.now() * 0.0001) * 3;
        cameraRef.current.position.y = Math.cos(Date.now() * 0.0001) * 3;
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      };

      animate();
    };

    initThree();

    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="landing-root">
      <div ref={canvasRef} className="three-background" />

      <nav className="navbar">
        <div className="navbar-content">
          <span className="brand orbitron gradient-text">ScamurAI</span>
          <Button variant="outline" className="cyber-btn">
            Login <i className="bi bi-box-arrow-in-right ml-1" />
          </Button>
        </div>
      </nav>

      <main className="main-section">
        <Container>
          
          <div className="flex flex-col md:flex-row gap-12 items-center justify-between">
            <div className="text-center md:text-left">
              <h1 className="orbitron text-4xl md:text-5xl font-bold mb-6 gradient-text">
                Protect Yourself from <br />Scams with AI
              </h1>
              <p className="text-indigo-100 text-lg mb-8">
                ScamurAI uses advanced artificial intelligence to detect and prevent online scams in real-time. Stay safe with our cutting-edge technology.
              </p>
              
            </div>

            <div className="hidden md:block floating">
              <div className="cyber-border p-1 rounded-lg">
                
              </div>
            </div>
          </div>

          <div className="cyber-line my-16" />

          <div className="mt-16 flex flex-col md:flex-row items-center justify-center gap-6 flex-wrap">
            {[
              {
                icon: "shield-check",
                title: "Real-time Protection",
                description: "Instant scanning and analysis of potential threats as they happen.",
              },
              {
                icon: "graph-up",
                title: "Smart Detection",
                description: "Advanced AI algorithms to identify sophisticated scam attempts.",
              },
              {
                icon: "phone",
                title: "Mobile Ready",
                description: "Protect yourself on any device, anywhere, anytime.",
              },
            ].map((feature, index) => (
              <Card
                key={index}
                className="feature-card w-[320px]"
              >
                <div className="feature-icon">
                  <i className={`bi bi-${feature.icon} text-2xl text-indigo-200`} />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-center orbitron text-indigo-200">
                  {feature.title}
                </h3>
                <p className="text-indigo-100 text-center">{feature.description}</p>
              </Card>
            ))}
          </div>
        </Container>
      </main>

      <footer className="footer mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-indigo-300">
            &copy; 2023 ScamurAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
