<template>
  <div class="auth-page auth-page--wide">
    <div class="profile-head">
      <h1 class="dbru-text-lg">Мой аккаунт</h1>
      <RouterLink v-slot="{ navigate }" :to="ROUTES.HOME" custom>
        <DbrButton variant="ghost" native-type="button" class="dbru-focusable" @click="navigate">
          Мои сессии
        </DbrButton>
      </RouterLink>
    </div>

    <p v-if="loadError" class="dbru-text-sm" style="color: var(--dbru-color-error)">{{ loadError }}</p>
    <div v-else-if="loading" class="profile-loading">
      <DbrLoader size="md" />
      <span class="dbru-text-sm dbru-text-muted">Загрузка…</span>
    </div>

    <template v-else>
      <DbrCard variant="bordered" as="section" class="dbru-surface profile-card">
        <div class="profile-card__pad">
          <h2 class="dbru-text-base dbru-text-main profile-card__title">Профиль</h2>
          <p class="dbru-text-sm dbru-text-muted profile-email">
            Email: <span class="dbru-text-main">{{ emailDisplay }}</span>
            <span class="dbru-text-xs"> (нельзя сменить здесь)</span>
          </p>
          <form class="profile-form" @submit.prevent="onSave">
            <DbrInput v-model="username" label="Имя пользователя (ник)" name="username" autocomplete="username" size="md" />
            <DbrInput v-model="firstName" label="Имя" name="given-name" autocomplete="given-name" size="md" />
            <DbrInput v-model="lastName" label="Фамилия" name="family-name" autocomplete="family-name" size="md" />
            <DbrInput
              v-model="avatarUrl"
              label="URL аватара"
              name="avatar"
              type="url"
              autocomplete="off"
              size="md"
            />
            <p v-if="saveError" class="dbru-text-sm" style="color: var(--dbru-color-error); margin: 0">
              {{ saveError }}
            </p>
            <DbrButton variant="primary" native-type="submit" class="dbru-focusable" :disabled="saving">
              {{ saving ? '…' : 'Сохранить' }}
            </DbrButton>
          </form>
        </div>
      </DbrCard>

      <DbrCard variant="bordered" as="section" class="dbru-surface profile-card profile-card--danger">
        <div class="profile-card__pad">
          <h2 class="dbru-text-base profile-card__title" style="color: var(--dbru-color-error)">Опасная зона</h2>
          <p class="dbru-text-sm dbru-text-muted" style="margin: 0 0 var(--dbru-space-3)">
            Удаление аккаунта необратимо: все сессии, токены и связанные данные в сервисе будут удалены (каскадом в
            базе).
          </p>
          <p v-if="deleteError" class="dbru-text-sm" style="color: var(--dbru-color-error); margin: 0 0 var(--dbru-space-3)">
            {{ deleteError }}
          </p>
          <DbrButton
            variant="danger"
            native-type="button"
            class="dbru-focusable"
            :disabled="deleting"
            @click="onDeleteAccount"
          >
            {{ deleting ? '…' : 'Удалить аккаунт' }}
          </DbrButton>
        </div>
      </DbrCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { DbrButton, DbrCard, DbrInput, DbrLoader } from 'dobruniaui-vue';
import { deleteAccount, fetchMe, patchProfile } from '@/api/auth-api';
import { ApiError } from '@/api/http';
import { ROUTES } from '@/constants/app.constants';
import { tokenStorage } from '@/lib/token-storage';

const router = useRouter();

const loading = ref(true);
const loadError = ref('');
const saving = ref(false);
const saveError = ref('');
const deleting = ref(false);
const deleteError = ref('');

const emailDisplay = ref('');
const username = ref('');
const firstName = ref('');
const lastName = ref('');
const avatarUrl = ref('');

onMounted(async () => {
  loadError.value = '';
  loading.value = true;
  try {
    const me = await fetchMe();
    emailDisplay.value = me.user.email;
    username.value = me.user.username ?? '';
    firstName.value = me.user.firstName ?? '';
    lastName.value = me.user.lastName ?? '';
    avatarUrl.value = me.user.avatarUrl ?? '';
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : 'Ошибка загрузки';
  } finally {
    loading.value = false;
  }
});

async function onSave() {
  saveError.value = '';
  saving.value = true;
  try {
    const me = await patchProfile({
      username: username.value,
      firstName: firstName.value,
      lastName: lastName.value,
      avatarUrl: avatarUrl.value,
    });
    username.value = me.user.username ?? '';
    firstName.value = me.user.firstName ?? '';
    lastName.value = me.user.lastName ?? '';
    avatarUrl.value = me.user.avatarUrl ?? '';
  } catch (e) {
    saveError.value = e instanceof ApiError ? e.message : 'Не удалось сохранить';
  } finally {
    saving.value = false;
  }
}

async function onDeleteAccount() {
  deleteError.value = '';
  const ok = globalThis.confirm(
    'Удалить аккаунт безвозвратно? Все сессии и данные профиля в Dobrunia Auth будут удалены.'
  );
  if (!ok) {
    return;
  }
  deleting.value = true;
  try {
    await deleteAccount();
    tokenStorage.clear();
    await router.replace(ROUTES.LOGIN);
  } catch (e) {
    deleteError.value = e instanceof ApiError ? e.message : 'Не удалось удалить аккаунт';
  } finally {
    deleting.value = false;
  }
}
</script>

<style scoped>
.auth-page {
  margin-inline: auto;
  padding: var(--dbru-space-5) var(--dbru-space-4);
}
.auth-page--wide {
  max-width: 32rem;
}
.profile-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--dbru-space-3);
  margin-bottom: var(--dbru-space-3);
}
.profile-loading {
  display: flex;
  align-items: center;
  gap: var(--dbru-space-3);
  margin-top: var(--dbru-space-4);
}
.profile-card {
  margin-top: var(--dbru-space-4);
}
.profile-card--danger {
  border-color: var(--dbru-color-border);
}
.profile-card__pad {
  padding: var(--dbru-space-4);
}
.profile-card__title {
  margin: 0 0 var(--dbru-space-3);
  font-weight: var(--dbru-font-weight-semibold);
}
.profile-email {
  margin: 0 0 var(--dbru-space-4);
  line-height: var(--dbru-line-height-base);
}
.profile-form {
  display: flex;
  flex-direction: column;
  gap: var(--dbru-space-3);
}
</style>
