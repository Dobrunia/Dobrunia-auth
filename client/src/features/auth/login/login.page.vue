<template>
  <div class="login-page">
    <DbrCard title="Sign In" class="login-card">
      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="form-field">
          <DbrInput
            v-model="form.email"
            label="Email"
            type="email"
            placeholder="Enter your email"
            :invalid="!!errors.email"
          />
          <span v-if="errors.email" class="error-text">{{ errors.email }}</span>
        </div>

        <div class="form-field">
          <DbrInput
            v-model="form.password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            :invalid="!!errors.password"
          />
          <span v-if="errors.password" class="error-text">{{ errors.password }}</span>
        </div>

        <div class="form-actions">
          <DbrButton type="submit" variant="primary" :disabled="isSubmitting">
            {{ isSubmitting ? 'Signing in...' : 'Sign In' }}
          </DbrButton>
        </div>

        <div v-if="submitError" class="submit-error">
          {{ submitError }}
        </div>
      </form>

      <div class="links">
        <div class="link-row">
          <router-link to="/forgot-password">Forgot password?</router-link>
        </div>
        <div class="link-row">
          Don't have an account?
          <router-link to="/register">Sign up</router-link>
        </div>
      </div>
    </DbrCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { DbrCard, DbrInput, DbrButton } from 'dobruniaui-vue';
import { loginSchema, type LoginInput } from '../../../shared/schemas';
import { request } from '../../../shared/api/request';
import { ROUTES } from '../../../constants/app.constants';

const router = useRouter();

const form = reactive<LoginInput>({
  email: '',
  password: '',
});

const errors = reactive<Partial<Record<keyof LoginInput, string>>>({});
const isSubmitting = ref(false);
const submitError = ref('');

function validateForm(): boolean {
  const result = loginSchema.safeParse(form);

  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    errors.email = fieldErrors.email?.[0] ?? '';
    errors.password = fieldErrors.password?.[0] ?? '';
    return false;
  }

  // Clear errors
  errors.email = '';
  errors.password = '';
  return true;
}

async function handleSubmit() {
  submitError.value = '';

  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;

  try {
    const response = await request('/auth/login', {
      method: 'POST',
      data: {
        email: form.email,
        password: form.password,
      },
    });

    // Store tokens from successful login response
    const data = response as { data?: { access_token: string; refresh_token: string } };
    if (data.data?.access_token && data.data?.refresh_token) {
      const { storeTokens } = await import('../../../shared/api/request');
      storeTokens(data.data.access_token, data.data.refresh_token);
    }

    // Redirect to home after successful login
    router.push(ROUTES.HOME);
  } catch (error) {
    if (error instanceof Error) {
      submitError.value = error.message;
    } else {
      submitError.value = 'Failed to sign in. Please check your credentials.';
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--dbru-space-4);
  background-color: var(--dbru-color-background);
}

.login-card {
  width: 100%;
  max-width: 420px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--dbru-space-4);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--dbru-space-1);
}

.error-text {
  color: var(--dbru-color-danger);
  font-size: var(--dbru-font-size-sm);
}

.form-actions {
  margin-top: var(--dbru-space-2);
}

.submit-error {
  color: var(--dbru-color-danger);
  font-size: var(--dbru-font-size-sm);
  margin-top: var(--dbru-space-2);
}

.links {
  margin-top: var(--dbru-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--dbru-space-2);
  font-size: var(--dbru-font-size-sm);
}

.link-row {
  text-align: center;
  color: var(--dbru-text-muted);
}

.link-row a {
  color: var(--dbru-color-primary);
  text-decoration: none;
}

.link-row a:hover {
  text-decoration: underline;
}
</style>
