import React from 'react';
import { VtcApplication } from '../../types';
import { CheckCircle2, AlertCircle, Clock, FileText } from 'lucide-react';

export const VtcDashboard: React.FC<{ user: any }> = ({ user }) => {
  const app = user as VtcApplication;

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <h1 className="text-3xl font-black text-coha-900 mb-2">Welcome, {app.firstName}!</h1>
        <p className="text-gray-600">Here is the status of your VTC application.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
          <FileText className="text-coha-500" size={24} />
          <h2 className="text-xl font-bold text-gray-900">Application Status</h2>
        </div>
        
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            {app.status === 'APPROVED' ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0">
                <CheckCircle2 size={32} />
              </div>
            ) : app.status === 'PAYMENT_REQUIRED' ? (
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 shrink-0">
                <AlertCircle size={32} />
              </div>
            ) : app.status === 'VERIFYING' ? (
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                <Clock size={32} />
              </div>
            ) : app.status === 'VERIFIED' ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0">
                <CheckCircle2 size={32} />
              </div>
            ) : (
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 shrink-0">
                <Clock size={32} />
              </div>
            )}
            
            <div>
              <h3 className="text-2xl font-black text-gray-900">{app.status.replace('_', ' ')}</h3>
              <p className="text-gray-600 mt-1">
                {app.status === 'APPROVED' && "Your application has been approved! Please proceed with the registration payment."}
                {app.status === 'PAYMENT_REQUIRED' && "Please pay the registration fee to secure your spot."}
                {app.status === 'VERIFYING' && "We are currently verifying your payment. This usually takes 1-2 business days."}
                {app.status === 'VERIFIED' && "Your payment has been verified. You are fully enrolled!"}
              </p>
            </div>
          </div>

          {(app.status === 'APPROVED' || app.status === 'PAYMENT_REQUIRED') && (
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <h4 className="font-bold text-blue-900 mb-4">Payment Instructions</h4>
              <p className="text-blue-800 text-sm mb-4">
                A non-refundable fee of N$50.00 must be paid to complete your registration.
              </p>
              <div className="bg-white p-4 rounded-lg border border-blue-100 mb-4">
                <ul className="text-sm text-gray-700 space-y-2">
                  <li><span className="font-bold">Account Name:</span> COHA TUTORIAL ACADEMY</li>
                  <li><span className="font-bold">Bank:</span> BANK WINDHOEK</li>
                  <li><span className="font-bold">Account No:</span> 8052796955</li>
                  <li><span className="font-bold">Account Type:</span> Cheque</li>
                  <li><span className="font-bold">Branch code:</span> 483378</li>
                  <li><span className="font-bold">Reference:</span> {app.firstName} {app.surname}</li>
                </ul>
              </div>
              <p className="text-sm text-blue-800">
                After making the payment, please send the proof of payment to our WhatsApp or Email.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
