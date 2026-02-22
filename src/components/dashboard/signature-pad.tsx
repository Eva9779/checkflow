'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Pencil, Type, ShieldCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}

export function SignaturePad({ onSave, onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [mode, setMode] = useState<'draw' | 'type'>('draw');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use Blue Ink (#0000ED)
    ctx.strokeStyle = '#0000ED';
    ctx.fillStyle = '#0000ED';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (mode === 'type' && typedName) {
      clearCanvas(false);
      ctx.fillStyle = '#0000ED';
      ctx.font = 'italic 48px "Dancing Script", cursive';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
      onSave(canvas.toDataURL());
    }
  }, [mode, typedName]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== 'draw') return;
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    if (mode !== 'draw') return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.beginPath();
      onSave(canvas.toDataURL());
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || mode !== 'draw') return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = (triggerClearCallback = true) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (triggerClearCallback) {
        onClear();
        setTypedName('');
      }
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={(val) => setMode(val as 'draw' | 'type')} className="w-full">
        <div className="flex items-center justify-between mb-2">
          <TabsList className="grid grid-cols-2 w-[200px]">
            <TabsTrigger value="draw" className="flex items-center gap-2">
              <Pencil className="w-3 h-3" /> Draw
            </TabsTrigger>
            <TabsTrigger value="type" className="flex items-center gap-2">
              <Type className="w-3 h-3" /> Type
            </TabsTrigger>
          </TabsList>
          {mode === 'draw' && (
            <Button type="button" variant="ghost" size="sm" onClick={() => clearCanvas()} className="h-8 text-xs text-muted-foreground">
              <Eraser className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}
        </div>

        <TabsContent value="draw" className="mt-0">
          <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg bg-white overflow-hidden relative group">
            <canvas
              ref={canvasRef}
              width={600}
              height={150}
              className="w-full h-[150px] cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseUp={stopDrawing}
              onMouseMove={draw}
              onTouchStart={startDrawing}
              onTouchEnd={stopDrawing}
              onTouchMove={draw}
            />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none text-[8px] uppercase tracking-widest text-muted-foreground/40 font-bold">
              Authorized Signatory Area
            </div>
          </div>
        </TabsContent>

        <TabsContent value="type" className="mt-0 space-y-4">
          <div className="space-y-2">
            <Input 
              placeholder="Type your full legal name" 
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              className="text-lg font-medium"
            />
          </div>
          <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg bg-slate-50/50 overflow-hidden relative">
            <canvas
              ref={canvasRef}
              width={600}
              height={150}
              className="w-full h-[150px] pointer-events-none"
            />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none text-[8px] uppercase tracking-widest text-muted-foreground/40 font-bold">
              Preview Authorized Signature
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        <ShieldCheck className="w-3 h-3 text-accent" /> This digital signature is legally binding and will be applied to the e-check issuance.
      </p>
    </div>
  );
}
