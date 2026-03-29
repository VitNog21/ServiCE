// src/controllers/CategoryController.js
import * as CategoryService from '../services/CategoryService.js';

export const getCategories = async (req, res) => {
  try {
    const categories = await CategoryService.getAllCategories();
    return res.status(200).json(categories);
  } catch (error) {
    console.error("Erro no CategoryController:", error.message);
    return res.status(500).json({ error: 'Erro interno ao carregar as categorias.' });
  }
};