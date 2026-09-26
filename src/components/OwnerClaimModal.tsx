import React, { useState } from 'react';
import { Listing } from '../types';
import { X, CheckCircle, ShieldCheck, Phone, KeyRound, Image as ImageIcon, Sparkles } from 'lucide-react';

interface Props {
  listing: Listing | null;
  onClose: () => void;
  onClaimSuccess: (updatedListing: Listing) => void;
}

export const OwnerClaimModal: React.FC<Props> = ({ listing, onClose, onClaimSuccess }) => {
  const [step, setStep] = useState<'phone' | 'otp' | 'details' | 'success'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('4821');
  const [rent, setRent] = useState(listing?.rent?.toString() || '');
  const [deposit, setDeposit] = useState(listing?.deposit?.toString() || '');
  const [notes, setNotes] = useState(listing?.notes || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!listing) return null;

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9)');
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(code);
      setLoading(false);
      setStep('otp');
    }, 600);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== generatedOtp && otp !== '1234') {
      setError('Incorrect OTP. Try the demo code provided below.');
      return;
    }
    setError('');
    setStep('details');
  };

  const handleSaveClaim = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const updated: Listing = {
        ...listing,
        rent: rent ? parseInt(rent) : listing.rent,
        deposit: deposit ? parseInt(deposit) : listing.deposit,
        notes: notes || listing.notes,
        photo_url: null,
        owner_verified: true,
        source: 'owner',
        last_seen_at: new Date().toISOString(),
      };

      setLoading(false);
      setStep('success');
      onClaimSuccess(updated);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500 rounded-lg text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Owner Verification</h3>
              <p className="text-xs text-slate-400">
                {listing.bhk} • {listing.house_no ? `${listing.house_no}, ` : ''}{listing.area}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {step === 'phone' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Phone className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-slate-900 text-sm">Are you the owner of this property?</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Claiming this pin adds the <strong>Verified Owner badge</strong>, keeps it active, and lets you add verified photos.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Mobile Number (For OTP Verification)
                </label>
                <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
                  <span className="bg-slate-100 px-3 py-2 text-xs text-slate-600 font-semibold border-r border-slate-200 flex items-center">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9812345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 text-sm outline-none"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  🔒 Privacy guarantee: Your number is strictly for OTP verification and is <strong>never published or shared</strong> on the map.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {loading ? 'Sending OTP...' : 'Send Verification Code'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-slate-900 text-sm">Enter 4-Digit Code</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Sent to +91 {phone}
                </p>
              </div>

              {/* Demo OTP Helper Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 flex items-center justify-between">
                <span>Demo Code: <strong>{generatedOtp}</strong> (or 1234)</span>
                <button
                  type="button"
                  onClick={() => setOtp(generatedOtp)}
                  className="text-amber-900 underline font-semibold text-[11px]"
                >
                  Auto-fill
                </button>
              </div>

              <div>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="• • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center tracking-[1em] font-mono text-2xl py-3 border border-slate-300 rounded-xl focus:border-emerald-500 outline-none"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-semibold"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md"
                >
                  Verify Code
                </button>
              </div>
            </form>
          )}

          {step === 'details' && (
            <form onSubmit={handleSaveClaim} className="space-y-3.5">
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Phone verified (+91 {phone}). Confirm your flat details below:</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Monthly Rent (₹)
                  </label>
                  <input
                    type="number"
                    value={rent}
                    onChange={(e) => setRent(e.target.value)}
                    placeholder="25000"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Deposit (₹)
                  </label>
                  <input
                    type="number"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    placeholder="25000"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Owner Note / Key Details
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. 2nd floor, modular kitchen, 1 car parking inside, family/bachelor friendly."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md hover:shadow-lg mt-2"
              >
                {loading ? 'Upgrading to Verified...' : 'Claim & Publish Verified Badge'}
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center py-4 space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <Sparkles className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-900 text-base">Listing Verified & Claimed!</h4>
              <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                Your listing is now marked with the <strong>✅ Owner Verified</strong> badge and freshness is renewed for 7 full days.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors mt-2"
              >
                View on Live Map
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
