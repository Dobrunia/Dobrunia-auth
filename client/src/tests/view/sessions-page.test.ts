import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';

vi.mock('@/api/auth-api', () => ({
  deleteSession: vi.fn(),
  fetchMe: vi.fn(),
  listSessions: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('vue-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

import { deleteSession, fetchMe, listSessions } from '@/api/auth-api';
import SessionsPage from '@/view/SessionsPage.vue';

const SessionClientGroupStub = defineComponent({
  props: {
    sessions: {
      type: Array,
      required: true,
    },
  },
  emits: ['revoke'],
  template: `
    <button
      class="session-group-stub"
      @click="$emit('revoke', sessions[0].id)"
    >
      {{ sessions[0].id }}
    </button>
  `,
});

describe('SessionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchMe).mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        username: null,
        firstName: null,
        lastName: null,
        avatarUrl: null,
      },
      session: {
        id: 'session-current',
        clientId: 'client-a',
        clientSlug: 'client-a',
        clientName: 'Client A',
      },
    });
    vi.mocked(listSessions).mockResolvedValue({
      sessions: [
        {
          id: 'session-current',
          status: 'active',
          clientId: 'client-a',
          clientSlug: 'client-a',
          clientName: 'Client A',
          ipAddress: null,
          userAgent: null,
          lastSeenAt: null,
          createdAt: '2026-06-08T10:00:00.000Z',
          revokedAt: null,
          revokeReason: null,
        },
        {
          id: 'session-other',
          status: 'active',
          clientId: 'client-b',
          clientSlug: 'client-b',
          clientName: 'Client B',
          ipAddress: null,
          userAgent: null,
          lastSeenAt: null,
          createdAt: '2026-06-08T09:00:00.000Z',
          revokedAt: null,
          revokeReason: null,
        },
      ],
    });
    vi.mocked(deleteSession).mockResolvedValue(undefined);
  });

  it('удаляет завершенную карточку локально без повторной загрузки списка', async () => {
    const wrapper = mount(SessionsPage, {
      global: {
        stubs: {
          RouterLink: true,
          SessionClientGroup: SessionClientGroupStub,
        },
      },
    });
    await flushPromises();

    const otherButton = wrapper
      .findAll('.session-group-stub')
      .find((button) => button.text() === 'session-other');
    expect(otherButton).toBeDefined();

    await otherButton!.trigger('click');
    await flushPromises();

    expect(deleteSession).toHaveBeenCalledWith('session-other');
    expect(listSessions).toHaveBeenCalledOnce();
    expect(wrapper.text()).not.toContain('session-other');
    expect(wrapper.text()).toContain('session-current');
  });
});
