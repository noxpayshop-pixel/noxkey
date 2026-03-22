import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Download, Trash2, Upload, FileText, Scissors, Merge } from 'lucide-react';
import { toast } from 'sonner';

export default function TxtToolsView() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">TXT Tools</h2>
      <Tabs defaultValue="cleaner" className="w-full">
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="cleaner" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Scissors className="w-3.5 h-3.5" /> Cleaner
          </TabsTrigger>
          <TabsTrigger value="combiner" className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Merge className="w-3.5 h-3.5" /> Combiner
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cleaner"><CleanerTab /></TabsContent>
        <TabsContent value="combiner"><CombinerTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function CleanerTab() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const clean = (text: string) => {
    const lines = text.split('\n');
    const cleaned = lines
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        // Match email:password or user:pass pattern, stop at space or pipe
        const match = trimmed.match(/^([^\s|]+:[^\s|]+)/);
        return match ? match[1] : trimmed;
      })
      .filter(l => l.length > 0);
    return cleaned.join('\n');
  };

  const handleClean = () => {
    if (!input.trim()) { toast.error('Paste or upload text first'); return; }
    const result = clean(input);
    setOutput(result);
    const inputCount = input.split('\n').filter(l => l.trim()).length;
    const outputCount = result.split('\n').filter(l => l.trim()).length;
    toast.success(`Cleaned ${inputCount} lines → ${outputCount} lines`);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setInput(text);
      toast.success(`Loaded ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'cleaned.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-4 mt-4">
      <p className="text-sm text-muted-foreground">
        Entfernt alles nach <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-primary">email:password</code> — pipes, notes, checker tags etc.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Input</label>
            <div className="flex gap-1.5">
              <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={handleFile} />
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => fileRef.current?.click()}>
                <Upload className="w-3 h-3" /> Upload .txt
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => { setInput(''); setOutput(''); }}>
                <Trash2 className="w-3 h-3" /> Clear
              </Button>
            </div>
          </div>
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste your combo lines here..."
            className="bg-card/50 border-border/60 text-foreground font-mono text-xs min-h-[300px] resize-y"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Output {output && <span className="text-primary ml-1">({output.split('\n').filter(l => l.trim()).length} lines)</span>}
            </label>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleCopy} disabled={!output}>
                <Copy className="w-3 h-3" /> Copy
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleDownload} disabled={!output}>
                <Download className="w-3 h-3" /> Download
              </Button>
            </div>
          </div>
          <Textarea
            value={output}
            readOnly
            placeholder="Cleaned output will appear here..."
            className="bg-card/50 border-border/60 text-foreground font-mono text-xs min-h-[300px] resize-y"
          />
        </div>
      </div>
      <Button variant="nox" onClick={handleClean} className="gap-2">
        <Scissors className="w-4 h-4" /> Clean Lines
      </Button>
    </div>
  );
}

function CombinerTab() {
  const [files, setFiles] = useState<{ name: string; content: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    Array.from(fileList).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setFiles(prev => [...prev, { name: file.name, content: text }]);
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const totalLines = files.reduce((sum, f) => sum + f.content.split('\n').filter(l => l.trim()).length, 0);

  const handleDownload = () => {
    if (files.length === 0) { toast.error('Upload files first'); return; }
    const combined = files.map(f => f.content.trim()).join('\n');
    const blob = new Blob([combined], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'combined.txt'; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Combined ${files.length} files (${totalLines} lines)`);
  };

  return (
    <div className="space-y-4 mt-4">
      <p className="text-sm text-muted-foreground">
        Lade beliebig viele <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-primary">.txt</code> Dateien hoch und kombiniere sie zu einer.
      </p>
      <input ref={fileRef} type="file" accept=".txt" multiple className="hidden" onChange={handleFiles} />
      
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-border/60 rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
      >
        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Klicke oder ziehe <span className="text-primary font-medium">.txt</span> Dateien hierher</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Mehrere Dateien gleichzeitig möglich</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {files.length} Dateien · {totalLines} Zeilen total
            </span>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive gap-1.5" onClick={() => setFiles([])}>
              <Trash2 className="w-3 h-3" /> Alle entfernen
            </Button>
          </div>
          <div className="grid gap-1.5">
            {files.map((f, i) => (
              <div key={i} className="nox-surface rounded-lg border border-border/50 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm text-foreground truncate">{f.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {f.content.split('\n').filter(l => l.trim()).length} lines
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeFile(i)}>
                  <Trash2 className="w-3 h-3 text-destructive/70" />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="nox" onClick={handleDownload} className="gap-2">
            <Download className="w-4 h-4" /> Download Combined ({totalLines} lines)
          </Button>
        </div>
      )}
    </div>
  );
}
