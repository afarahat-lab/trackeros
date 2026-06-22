export const applyLeaveSchema = {
  body: {
    type: 'object',
    required: ['leaveTypeId', 'startDate', 'endDate'],
    properties: {
      leaveTypeId: { type: 'string', format: 'uuid' },
      startDate: { type: 'string', format: 'date' },
      endDate: { type: 'string', format: 'date' },
      reason: { type: 'string' }
    }
  }
};

export const approveLeaveSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' }
    }
  }
};

export const rejectLeaveSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' }
    }
  },
  body: {
    type: 'object',
    properties: {
      reason: { type: 'string' }
    }
  }
};

export const cancelLeaveSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' }
    }
  }
};

export const getLeaveRequestSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' }
    }
  }
};

export const getLeaveRequestsSchema = {
  querystring: {
    type: 'object',
    properties: {
      status: { type: 'string' },
      employeeId: { type: 'string', format: 'uuid' }
    }
  }
};

export const getLeaveBalanceSchema = {
  querystring: {
    type: 'object',
    properties: {
      leaveTypeId: { type: 'string', format: 'uuid' },
      year: { type: 'integer' }
    }
  }
};
