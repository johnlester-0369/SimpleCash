/**
 * Admin Settings — Account Feature — Service
 *
 * @module app/features/settings/account/account.service
 */
import { NotFoundError } from '@/infra/lib/errors/app-error.lib.js'
import { accountRepository } from './account.repository.js'
import type { AccountProfile } from './account.types.js'

export const accountService = {
  async getAccount(id: string): Promise<AccountProfile> {
    const account = await accountRepository.findById(id)
    if (!account) throw new NotFoundError('Account not found')
    return account
  },
}
