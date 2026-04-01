<template>
  <div class="register-page">
    <DbrCard title="Create Account" class="register-card">
      <form @submit.prevent="handleSubmit" class="register-form">
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

        <div class="form-field">
          <DbrInput
            v-model="form.confirm_password"
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            :invalid="!!errors.confirm_password"
          />
          <span v-if="errors.confirm_password" class="error-text">{{ errors.confirm_password }}</span>
        </div>

        <div class="form-actions">
          <DbrButton type="submit" variant="primary" :disabled="isSubmitting">
            {{ isSubmitting ? 'Creating account...' : 'Create Account' }}
          </DbrButton>
        </div>

        <div v-if="submitError" class="submit-error">
          {{ submitError }}
        </div>
      </form>

      <div class="login-link">
        Already have an account?
        <router-link to="/login">Sign in</router-link>
      </div>
    </DbrCard>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { DbrCard, DbrInput, DbrButton } from 'dobruniaui-vue';
import { registerSchema, type RegisterInput } from '../../../shared/schemas';
import { request } from '../../../shared/api/request';
import { ROUTES } from '../../../constants/app.constants';

const router = useRouter();

const form = reactive<RegisterInput>({
  email: '',
  password: '',
  confirm_password: '',
});

const errors = reactive<Partial<Record<keyof RegisterInput, string>>>({});
const isSubmitting = ref(false);
const submitError = ref('');

function validateForm(): boolean {
  const result = registerSchema.safeParse(form);

  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    errors.email = fieldErrors.email?.[0] ?? '';
    errors.password = fieldErrors.password?.[0] ?? '';
    errors.confirm_password = fieldErrors.confirm_password?.[0] ?? '';
    return false;
  }

  // Clear errors
  errors.email = '';
  errors.password = '';
  errors.confirm_password = '';
  return true;
}

async function handleSubmit() {
  submitError.value = '';

  if (!validateForm()) {
    return;
  }

  isSubmitting.value = true;

  try {
    await request('/auth/register', {
      method: 'POST',
      data: {
        email: form.email,
        password: form.password,
      },
    });

    // Redirect to login after successful registration
    router.push(ROUTES.LOGIN);
  } catch (error) {
    if (error instanceof Error) {
      submitError.value = error.message;
    } else {
      submitError.value = 'Failed to create account. Please try again.';
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.register-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--dbru-space-4);
  background-color: var(--dbru-color-background);
}

.register-card {
  width: 100%;
  max-width: 420px;
}

.register-form {
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

.login-link {
  margin-top: var(--dbru-space-4);
  text-align: center;
  font-size: var(--dbru-font-size-sm);
  color: var(--dbru-text-muted);
}

.login-link a {
  color: var(--dbru-color-primary);
  text-decoration: none;
}

.login-link a:hover {
  text-decoration: underline;
}
</style>
