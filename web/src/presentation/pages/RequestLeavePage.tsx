import { useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ILeaveService } from '../../modules/leave/index';
import { validateLeaveRequestInput } from '../../modules/leave/index';
import type { CreateLeaveRequestInput } from '../../shared/types/index';
import { LeaveTypeCode } from '../../shared/types/index';

export interface RequestLeavePageProps {
  leaveService: ILeaveService;
}

export function RequestLeavePage({
  leaveService,
}: RequestLeavePageProps): ReactElement {
  const navigate = useNavigate();

  const [leaveTypeCode, setLeaveTypeCode] = useState<LeaveTypeCode | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationErrors([]);
    setError(null);

    const input: CreateLeaveRequestInput = {
      leaveTypeCode: leaveTypeCode as LeaveTypeCode,
      startDate,
      endDate,
    };

    const errors = validateLeaveRequestInput(input);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const created = await leaveService.create(input);
      navigate(`/leaves/${created.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="leaveType">Leave type</label>
        <select
          id="leaveType"
          value={leaveTypeCode}
          onChange={(e) => setLeaveTypeCode(e.target.value as LeaveTypeCode)}
        >
          <option value="">Select a leave type</option>
          {Object.values(LeaveTypeCode).map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="startDate">Start date</label>
        <input
          id="startDate"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="endDate">End date</label>
        <input
          id="endDate"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      {validationErrors.length > 0 && (
        <div role="alert">
          {validationErrors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}
      {error !== null && <div role="alert">{error}</div>}
      <button type="submit" disabled={submitting}>
        Submit request
      </button>
    </form>
  );
}
