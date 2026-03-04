'use client';

import { CarWashJob } from '@/lib/api/car-wash.api';
import { WashTypeBadge } from './WashTypeBadge';

interface Props {
  jobs: CarWashJob[];
  loading?: boolean;
}

export function CarWashJobsTable({ jobs, loading }: Props) {
  if (loading) return <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>;
  if (!jobs.length) return <div className="text-center py-8 text-gray-400 text-sm">No car wash jobs found.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="px-3 py-2 font-medium text-gray-600">Date</th>
            <th className="px-3 py-2 font-medium text-gray-600">Vehicle</th>
            <th className="px-3 py-2 font-medium text-gray-600">Type</th>
            <th className="px-3 py-2 font-medium text-gray-600 text-right">Amount</th>
            <th className="px-3 py-2 font-medium text-gray-600">Payment</th>
            <th className="px-3 py-2 font-medium text-gray-600">Station</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {jobs.map((job) => (
            <tr key={job.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-600">{job.washDate?.slice(0, 10)}</td>
              <td className="px-3 py-2 font-medium">{job.vehicleNumber}</td>
              <td className="px-3 py-2"><WashTypeBadge type={job.washType} /></td>
              <td className="px-3 py-2 text-right font-medium">Rs. {Number(job.amountLkr).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
              <td className="px-3 py-2 text-gray-500 capitalize">{job.paymentMethod?.toLowerCase()}</td>
              <td className="px-3 py-2 text-gray-500">{job.station?.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
