import { Response } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';

// GET /api/contacts - Получить все контакты пользователя
export async function getAllContacts(req: AuthRequest, res: Response) {
  try {
    const contacts = await prisma.contact.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });

    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
}

// GET /api/contacts/:id - Получить контакт по ID
export async function getContactById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const contact = await prisma.contact.findFirst({
      where: {
        id,
        userId: req.userId!,
      },
    });

    if (!contact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    res.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
}

// POST /api/contacts - Создать новый контакт
export async function createContact(req: AuthRequest, res: Response) {
  try {
    const data = req.body;

    // Валидация
    if (!data.name || data.name.trim() === '') {
      res.status(400).json({ error: 'Contact name is required' });
      return;
    }

    const contact = await prisma.contact.create({
      data: {
        name: data.name.trim(),
        phone: data.phone,
        email: data.email,
        company: data.company,
        position: data.position,
        tags: data.tags,
        customFields: data.customFields,
        crmId: data.crmId,
        crmType: data.crmType,
        userId: req.userId!,
      },
    });

    res.status(201).json(contact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
}

// PUT /api/contacts/:id - Обновить контакт
export async function updateContact(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const data = req.body;

    // Проверяем что контакт принадлежит пользователю
    const existingContact = await prisma.contact.findFirst({
      where: { id, userId: req.userId! },
    });

    if (!existingContact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        company: data.company,
        position: data.position,
        tags: data.tags,
        customFields: data.customFields,
      },
    });

    res.json(contact);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
}

// DELETE /api/contacts/:id - Удалить контакт
export async function deleteContact(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    // Проверяем что контакт принадлежит пользователю
    const existingContact = await prisma.contact.findFirst({
      where: { id, userId: req.userId! },
    });

    if (!existingContact) {
      res.status(404).json({ error: 'Contact not found' });
      return;
    }

    await prisma.contact.delete({
      where: { id },
    });

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
}
