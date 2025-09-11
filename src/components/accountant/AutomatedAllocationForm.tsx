'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Zap, Send, User, AlertCircle, CheckCircle } from 'lucide-react';

interface AutomatedAllocationFormProps {
  onAllocationCreated?: () => void;
}

export default function AutomatedAllocationForm({ onAllocationCreated }: AutomatedAllocationFormProps) {
  const [selectedPM, setSelectedPM] = useState<string>('');

  const handleSendAllocation = () => {
    // Placeholder function
    alert('Automated allocation feature coming soon!');
    if (onAllocationCreated) {
      onAllocationCreated();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <Zap className="w-6 h-6 mr-2" />
            Automated Allocation System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <AlertCircle className="w-5 h-5 text-blue-600 mr-3" />
            <div>
              <h4 className="text-sm font-semibold text-blue-800 mb-1">Feature Under Development</h4>
              <p className="text-sm text-blue-700">
                The automated allocation system is currently being enhanced. Please use the manual allocation form below for now.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}