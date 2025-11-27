import apiClient from './apiClient';

export interface GoogleCalendarEmployee {
  id: string;
  crmUserId: string;
  crmUserName: string;
  googleEmail: string | null;
  status: 'pending' | 'connected' | 'expired';
  inviteExpiresAt: string;
  createdAt: string;
}

export interface CreateInviteResponse {
  success: boolean;
  inviteUrl: string;
  employeeId: string;
  message?: string;
}

export interface FreeBusySlot {
  start: string;
  end: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string };
  end: { dateTime: string };
  htmlLink: string;
  meetLink?: string;
}

class GoogleCalendarService {
  /**
   * Get list of employees for an agent
   */
  async getEmployees(agentId: string): Promise<GoogleCalendarEmployee[]> {
    const response = await apiClient.get('/google-calendar/employees', {
      params: { agentId },
    });
    return response.data.employees || [];
  }

  /**
   * Create invite for employee
   */
  async createInvite(
    agentId: string,
    crmUserId: string,
    crmUserName: string
  ): Promise<CreateInviteResponse> {
    const response = await apiClient.post('/google-calendar/employees', {
      agentId,
      crmUserId,
      crmUserName,
    });
    return response.data;
  }

  /**
   * Delete employee
   */
  async deleteEmployee(employeeId: string): Promise<void> {
    await apiClient.delete(`/google-calendar/employees/${employeeId}`);
  }

  /**
   * Check free/busy times for employee
   */
  async checkFreeBusy(
    agentId: string,
    crmUserId: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<FreeBusySlot[]> {
    const response = await apiClient.post('/google-calendar/free-busy', {
      agentId,
      crmUserId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
    });
    return response.data.busyTimes || [];
  }

  /**
   * Create meeting event with Google Meet
   */
  async createMeetingEvent(
    agentId: string,
    crmUserId: string,
    event: {
      summary: string;
      description?: string;
      start: Date;
      end: Date;
      attendeeEmail?: string;
    }
  ): Promise<CalendarEvent> {
    const response = await apiClient.post('/google-calendar/create-event', {
      agentId,
      crmUserId,
      summary: event.summary,
      description: event.description,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      attendeeEmail: event.attendeeEmail,
    });
    return response.data.event;
  }
}

export const googleCalendarService = new GoogleCalendarService();
export default googleCalendarService;
