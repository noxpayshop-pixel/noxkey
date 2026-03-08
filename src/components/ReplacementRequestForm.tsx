import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDiscordAuth } from '@/contexts/DiscordAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getSettings } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle, Upload, CheckCircle2, Loader2, ExternalLink, ImageIcon, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface ReplacementRequestFormProps {
  onSuccess?: () => void;
}

const ReplacementRequestForm = ({ onSuccess }: ReplacementRequestFormProps) => {
  const { discordUsername } = useDiscordAuth();
  const [step, setStep] = useState<'form' | 'vouch' | 'submit' | 'done'>('form');
  const [redeemCode, setRedeemCode] = useState('');
  const [problemDesc, setProblemDesc] = useState('');
  const [problemFile, setProblemFile] = useState<File | null>(null);
  const [problemPreview, setProblemPreview] = useState<string | null>(null);
  const [vouchFile, setVouchFile] = useState<File | null>(null);
  const [vouchPreview, setVouchPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [timeError, setTimeError] = useState('');

  const settings = getSettings();

  const handleProblemFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProblemFile(file);
      setProblemPreview(URL.createObjectURL(file));
    }
  };

  const handleVouchFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVouchFile(file);
      setVouchPreview(URL.createObjectURL(file));
    }
  };

  const validateCode = async () => {
    if (!redeemCode.trim() || !discordUsername) return;
    setError('');
    setTimeError('');

    // Check if code exists and belongs to user
    const { data } = await supabase
      .from('redemptions')
      .select('*')
      .eq('code', redeemCode.trim())
      .eq('discord', discordUsername)
      .single();

    if (!data) {
      setCodeValid(false);
      setError('This key was not found in your claims.');
      return;
    }

    // Check 24h time limit
    const claimTime = new Date(data.created_at!).getTime();
    const now = Date.now();
    const hoursSinceClaim = (now - claimTime) / (1000 * 60 * 60);

    if (hoursSinceClaim > 24) {
      setCodeValid(false);
      setTimeError('Replacement requests must be submitted within 24 hours of claiming.');
      return;
    }

    // Check if there's already a pending request
    const { data: existing } = await supabase
      .from('replacement_requests')
      .select('id')
      .eq('redeem_code', redeemCode.trim())
      .eq('discord_username', discordUsername)
      .eq('status', 'pending')
      .single();

    if (existing) {
      setCodeValid(false);
      setError('You already have a pending replacement request for this key.');
      return;
    }

    setCodeValid(true);
  };

  const handleNext = () => {
    if (!problemDesc.trim() || !problemFile) {
      setError('Please provide both a description and screenshot of the problem.');
      return;
    }
    setError('');
    setStep('vouch');
  };

  const handleSubmit = async () => {
    if (!vouchFile || !discordUsername) {
      setError('Please upload a screenshot of your vouch.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Upload problem screenshot
      const problemPath = `problems/${discordUsername}/${Date.now()}_${problemFile!.name}`;
      const { error: uploadErr1 } = await supabase.storage
        .from('screenshots')
        .upload(problemPath, problemFile!);
      if (uploadErr1) throw uploadErr1;

      const { data: problemUrl } = supabase.storage
        .from('screenshots')
        .getPublicUrl(problemPath);

      // Upload vouch screenshot
      const vouchPath = `vouches/${discordUsername}/${Date.now()}_${vouchFile.name}`;
      const { error: uploadErr2 } = await supabase.storage
        .from('screenshots')
        .upload(vouchPath, vouchFile);
      if (uploadErr2) throw uploadErr2;

      const { data: vouchUrl } = supabase.storage
        .from('screenshots')
        .getPublicUrl(vouchPath);

      // Get product_id from code
      const { data: redemption } = await supabase
        .from('redemptions')
        .select('product_id')
        .eq('code', redeemCode.trim())
        .eq('discord', discordUsername)
        .single();

      // Create replacement request
      const { error: insertErr } = await supabase
        .from('replacement_requests')
        .insert({
          discord_username: discordUsername,
          product_id: redemption!.product_id,
          redeem_code: redeemCode.trim(),
          problem_description: problemDesc.trim(),
          problem_screenshot_url: problemUrl.publicUrl,
          vouch_screenshot_url: vouchUrl.publicUrl,
        });

      if (insertErr) throw insertErr;

      setStep('done');
      toast.success('Replacement request submitted!');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="nox-surface rounded-2xl border border-border p-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-primary" />
        Request Automated Replacement
      </h3>

      <AnimatePresence mode="wait">
        {step === 'form' && (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Redeem Code */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Product Key</label>
              <div className="flex gap-2">
                <Input
                  value={redeemCode}
                  onChange={(e) => { setRedeemCode(e.target.value.toUpperCase()); setCodeValid(null); setError(''); setTimeError(''); }}
                  placeholder="NOX-XXXXXXXX"
                  className="font-mono bg-background border-border text-foreground placeholder:text-muted-foreground"
                />
                <Button variant="noxOutline" size="sm" onClick={validateCode} disabled={!redeemCode.trim()}>
                  Verify
                </Button>
              </div>
              {codeValid === true && <p className="text-xs text-green-400 mt-1">✓ Key verified</p>}
              {codeValid === false && error && <p className="text-xs text-destructive mt-1">{error}</p>}
              {timeError && <p className="text-xs text-destructive mt-1">{timeError}</p>}
            </div>

            {codeValid && (
              <>
                {/* Problem description */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">What's the problem?</label>
                  <Textarea
                    value={problemDesc}
                    onChange={(e) => setProblemDesc(e.target.value)}
                    placeholder="Describe the issue with your deliverable..."
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground min-h-[80px]"
                  />
                </div>

                {/* Problem screenshot */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Screenshot of the problem</label>
                  {problemPreview ? (
                    <div className="relative">
                      <img src={problemPreview} alt="Problem" className="rounded-xl border border-border max-h-48 object-contain" />
                      <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 bg-background/80" onClick={() => { setProblemFile(null); setProblemPreview(null); }}>
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary/30 transition-colors">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to upload screenshot</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleProblemFile} />
                    </label>
                  )}
                </div>

                {error && !codeValid && <p className="text-sm text-destructive">{error}</p>}

                <Button variant="nox" className="w-full" onClick={handleNext}>
                  Next — Upload Vouch
                </Button>
              </>
            )}
          </motion.div>
        )}

        {step === 'vouch' && (
          <motion.div key="vouch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="text-sm text-foreground font-medium mb-2">Before requesting a replacement, you must vouch.</p>
              <p className="text-xs text-muted-foreground mb-3">
                Please leave a vouch on one of the platforms below, then upload a screenshot of it.
              </p>
              <div className="flex flex-wrap gap-2">
                {settings.vouchUrl && (
                  <a href={settings.vouchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-full">
                    <ExternalLink className="w-3 h-3" /> MyVouch.es
                  </a>
                )}
                <a href="https://sellauth.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-full">
                  <ExternalLink className="w-3 h-3" /> SellAuth
                </a>
              </div>
            </div>

            {/* Vouch screenshot */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Screenshot of your vouch</label>
              {vouchPreview ? (
                <div className="relative">
                  <img src={vouchPreview} alt="Vouch" className="rounded-xl border border-border max-h-48 object-contain" />
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 bg-background/80" onClick={() => { setVouchFile(null); setVouchPreview(null); }}>
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary/30 transition-colors">
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload vouch screenshot</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleVouchFile} />
                </label>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep('form')}>Back</Button>
              <Button variant="nox" className="flex-1" onClick={handleSubmit} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Submit Request
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-lg font-semibold text-foreground">Request Submitted!</p>
            <p className="text-sm text-muted-foreground mt-1">We'll review your request and get back to you soon.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ReplacementRequestForm;
