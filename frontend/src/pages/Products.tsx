import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Box, Plus, Search, Layers, Activity,
    ShoppingCart, ArrowUpDown, Edit3,
    MoreVertical, User, Tag, MapPin,
    X, Check, AlertCircle, Package, Trash2, FileText, Eye, Upload, Calendar, History, ChevronDown, ChevronUp, LayoutDashboard, Camera, Image as ImageIcon, Loader2
} from 'lucide-react';
import clsx from 'clsx';
import { API_URL, getAssetUrl } from '../api';
import { SideDrawer } from '../components/ui/SideDrawer';
import { ProductInventoryDashboard } from '../components/products/ProductInventoryDashboard';
import { Capacitor } from '@capacitor/core';
import { capturePhotoFromCamera, pickPhotoFromGallery } from '../utils/camera';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', 0.8);
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
};

const MAX_PRODUCT_PDF_SIZE = 24 * 1024 * 1024;

const isProductPdf = (file: File) =>
    file.name.toLowerCase().endsWith('.pdf')
    && (file.type === '' || file.type === 'application/pdf' || file.type === 'application/octet-stream');

interface Product {
    id: number;
    sku_producto: string;
    nombre_producto: string;
    descripcion?: string | null;
    cliente_id?: number | null;
    cliente?: { id: number; nombre: string; contacto?: string; direccion?: string } | null;
    acabado?: string | null;
    imagen_url?: string | null;
    stock_actual: number;
    stock_minimo?: number | null;
    stock_maximo?: number | null;
    ancho_tira?: number | null;
    fuerza_troquelado?: number | null;
    medidas_pieza?: string | null;
    piezas_lamina_4x8?: string | null;
    piezas_lamina_2x1?: string | null;
    empaque_de?: string | null;
    ubicacion?: string | null;
    plano_pdf_url?: string | null;
    activo: boolean;
    precio_venta?: number | null;
    listaMateriales?: { id: number; materia_prima_id: number; materiaPrima: { nombre_mp: string; unidad_medida_stock: string }; cantidad_requerida: number }[];
    rutas?: any[];
}

const initialNewProductState = {
    nombre_producto: '',
    sku_producto: '',
    cliente_id: '',
    acabado: '',
    ancho_tira: '',
    fuerza_troquelado: '',
    medidas_pieza: '',
    piezas_lamina_4x8: '',
    piezas_lamina_2x1: '',
    empaque_de: '',
    stock_actual: 0,
    stock_minimo: '',
    stock_maximo: '',
    precio_venta: '',
};

export const Products = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'catalogo'>('dashboard');
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [productLoadError, setProductLoadError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [clientFilter, setClientFilter] = useState('');
    const [showMoreSummary, setShowMoreSummary] = useState(false);
    const [materialFilter, setMaterialFilter] = useState('');
    const [sortByClientAsc, setSortByClientAsc] = useState(true);

    // UI States
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showOTModal, setShowOTModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showKardexModal, setShowKardexModal] = useState(false);
    const [showRouteModal, setShowRouteModal] = useState(false);
    const [movements, setMovements] = useState<any[]>([]);
    const [routesData, setRoutesData] = useState<any[]>([]);

    // Form States
    const [stockQty, setStockQty] = useState('');
    const [stockType, setStockType] = useState<'entrada' | 'salida'>('entrada');
    const [otQty, setOtQty] = useState('');
    const [otDate, setOtDate] = useState('');
    const [sheetQty, setSheetQty] = useState('');
    const [sheetType, setSheetType] = useState<'4x8' | '2x1'>('4x8');

    // Edit Form States
    const [editData, setEditData] = useState<any>({ ...initialNewProductState, materials: [] });
    const [newProductData, setNewProductData] = useState<any>({ ...initialNewProductState });
    const [newProductImageFile, setNewProductImageFile] = useState<File | undefined>();
    const [newProductPdfFile, setNewProductPdfFile] = useState<File | undefined>();

    const [clients, setClients] = useState<any[]>([]);
    const [allMateriaPrima, setAllMateriaPrima] = useState<any[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPDFModal, setShowPDFModal] = useState(false);
    const [showInactive, setShowInactive] = useState(false);
    const [isCreatingProduct, setIsCreatingProduct] = useState(false);
    const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleImagePasteFromClipboard = (
        event: React.ClipboardEvent<HTMLDivElement>,
        setFile: (file: File | undefined) => void
    ) => {
        const clipboardItem = Array.from(event.clipboardData?.items ?? []).find(
            item => item.kind === 'file' && item.type.startsWith('image/')
        );

        if (!clipboardItem) return;

        event.preventDefault();
        const pastedFile = clipboardItem.getAsFile();
        if (!pastedFile) return;

        const fileType = pastedFile.type.toLowerCase();
        const supportedTypes = ['image/png', 'image/jpeg', 'image/webp'];
        if (!supportedTypes.includes(fileType) && !fileType.startsWith('image/')) {
            setNotice({ type: 'error', message: 'Solo se permiten imágenes PNG, JPG/JPEG o WEBP.' });
            return;
        }

        const fileName = pastedFile.name || `captura-${Date.now()}.png`;
        setFile(new File([pastedFile], fileName, { type: fileType || 'image/png' }));
        setNotice(null);
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/products`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            setProducts(res.data);
            setProductLoadError('');
        } catch (error) {
            console.error(error);
            setProductLoadError(axios.isAxiosError(error)
                ? error.response?.data?.error || error.message
                : error instanceof Error ? error.message : 'No fue posible cargar los productos.');
        } finally {
            setLoading(false);
        }
    };

    const fetchMateriaPrima = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/inventory`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            setAllMateriaPrima(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchClients = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/clients`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            setClients(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchClients();
        fetchMateriaPrima();
    }, []);

    const allMaterials = Array.from(new Set(products.flatMap(p => (p.listaMateriales || []).map((m: any) => m.materiaPrima?.nombre_mp)))).filter(Boolean);

    const handleStockAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        try {
            await axios.post(`${API_URL}/products/${selectedProduct.id}/stock`, {
                cantidad: Number(stockQty),
                tipo: stockType
            });
            setShowStockModal(false);
            setStockQty('');
            fetchProducts();
        } catch (error) {
            alert('Error ajustando stock');
        }
    };

    const fetchMovements = async (productId: number) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/products/${productId}/movements`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            setMovements(res.data);
            setShowKardexModal(true);
        } catch (error) {
            alert('Error cargando movimientos');
        }
    };

    const handleCreateOT = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/orders`, {
                tipo_orden: 'PRODUCCION_SERIE',
                producto_id: selectedProduct.id,
                cantidad_fabricar: Number(otQty),
                cliente: selectedProduct.cliente?.nombre,
                fecha_entrega_req: otDate
            }, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            setShowOTModal(false);
            setOtQty('');
            setOtDate('');
            setSheetQty('');
            alert('Orden de Trabajo creada con éxito');
        } catch (error: any) {
            const errMsg = error.response?.data?.error || 'Error creando OT';
            alert(errMsg);
        }
    };

    const handleEditProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        let failedStage = 'actualizando los datos del producto';
        try {
            const token = localStorage.getItem('token');
            // If there's a new image file selected, upload it first
            if (editData.imageFile) {
                failedStage = 'subiendo la foto del producto';
                const compressedFile = await compressImage(editData.imageFile);
                const form = new FormData();
                form.append('image', compressedFile, compressedFile.name);
                await axios.post(`${API_URL}/products/${selectedProduct.id}/image`, form, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
            }

            // If there's a new PDF file selected, upload it
            if (editData.pdfFile) {
                failedStage = 'subiendo el plano PDF';
                const form = new FormData();
                form.append('pdf', editData.pdfFile, editData.pdfFile.name);
                await axios.post(`${API_URL}/products/${selectedProduct.id}/pdf`, form, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
            }

            // Prepare payload for material association
            failedStage = 'actualizando los datos del producto';
            const productData = { ...editData };
            delete productData.imageFile;
            delete productData.pdfFile;
            const payload = {
                ...productData,
                precio_venta: editData.precio_venta ? Number(editData.precio_venta) : 0,
                materials: (editData.materials || []).map((m: any) => ({
                    materia_prima_id: m.materia_prima_id,
                    cantidad_requerida: Number(m.cantidad_requerida) || 1
                }))
            };

            const updateResponse = await axios.put(`${API_URL}/products/${selectedProduct.id}`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            setSelectedProduct({ ...selectedProduct, ...updateResponse.data });
            setShowEditModal(false);
            fetchProducts();
            alert('Producto actualizado con éxito');
        } catch (error) {
            console.error(`Error ${failedStage}:`, error);
            const message = axios.isAxiosError(error)
                ? error.response?.data?.error || error.message
                : error instanceof Error ? error.message : '';
            alert(`No se pudo ${failedStage}${message ? `: ${message}` : '. Revisa la conexión e inténtalo nuevamente.'}`);
        }
    };

    const handleDeleteProduct = async () => {
        if (!selectedProduct) return;
        if (!window.confirm(`¿Estás seguro de que deseas eliminar el producto "${selectedProduct.nombre_producto}"? Esta acción no se puede deshacer.`)) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/products/${selectedProduct.id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            setShowDeleteModal(false);
            fetchProducts();
            alert('Producto eliminado con éxito');
        } catch (error: any) {
            const errMsg = error.response?.data?.error || 'Error eliminando producto';
            alert(errMsg);
        }
    };

    const handleCreateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isCreatingProduct) return;

        setIsCreatingProduct(true);
        setNotice(null);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/products`, newProductData, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });

            let createdProduct = response.data?.product ?? response.data ?? newProductData;
            const uploadErrors: string[] = [];
            if (newProductImageFile) {
                if (createdProduct.id) {
                    try {
                        const compressedFile = await compressImage(newProductImageFile);
                        const form = new FormData();
                        form.append('image', compressedFile, compressedFile.name);
                        const imageResponse = await axios.post(`${API_URL}/products/${createdProduct.id}/image`, form, {
                            headers: token ? { Authorization: `Bearer ${token}` } : undefined
                        });
                        createdProduct = imageResponse.data;
                    } catch (error: any) {
                        uploadErrors.push(error.response?.data?.error || 'No fue posible guardar la imagen en el servidor.');
                    }
                } else {
                    uploadErrors.push('No se recibió el identificador del producto para asociar la imagen.');
                }
            }

            if (newProductPdfFile) {
                if (createdProduct.id) {
                    try {
                        const form = new FormData();
                        form.append('pdf', newProductPdfFile, newProductPdfFile.name);
                        const pdfResponse = await axios.post(`${API_URL}/products/${createdProduct.id}/pdf`, form, {
                            headers: token ? { Authorization: `Bearer ${token}` } : undefined
                        });
                        createdProduct = pdfResponse.data;
                    } catch (error: any) {
                        uploadErrors.push(error.response?.data?.error || 'No fue posible guardar el plano PDF en el servidor.');
                    }
                } else {
                    uploadErrors.push('No se recibió el identificador del producto para asociar el plano PDF.');
                }
            }

            setProducts(prev => [createdProduct, ...prev]);
            setShowCreateModal(false);
            setNewProductData({ ...initialNewProductState });
            setNewProductImageFile(undefined);
            setNewProductPdfFile(undefined);
            setNotice(uploadErrors.length
                ? { type: 'error', message: `Producto creado, pero falló la carga de archivos: ${uploadErrors.join(' ')}` }
                : { type: 'success', message: 'Producto creado correctamente.' });
        } catch (error: any) {
            const errMsg = error.response?.data?.error || 'Error creando producto';
            setNotice({ type: 'error', message: errMsg });
        } finally {
            setIsCreatingProduct(false);
        }
    };

    const handleUpdateRoutes = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/products/${selectedProduct.id}/routes`, {
                routes: routesData
            }, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            setShowRouteModal(false);
            fetchProducts();
            alert('Ruta de producción actualizada con éxito');
        } catch (error: any) {
            console.error('Error updating routes:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Error actualizando ruta de producción';
            alert(errorMsg);
        }
    };

    const openRouteModal = (product: Product) => {
        setSelectedProduct(product);
        setRoutesData((product.rutas || []).map(r => ({
            id: r.id,
            no: r.no_operacion,
            nombre: r.nombre_operacion,
            centro: r.centro_trabajo,
            piezas_hora: r.piezas_por_hora_estimado ?? '',
            tiempo_estandar: r.tiempo_estandar ?? ''
        })));
        setShowRouteModal(true);
    };

    const openEditModal = (product: Product) => {
        setSelectedProduct(product);
        setEditData({
            nombre_producto: product.nombre_producto,
            sku_producto: product.sku_producto,
            cliente_id: product.cliente_id?.toString() || '',
            acabado: product.acabado || '',
            ancho_tira: product.ancho_tira || '',
            fuerza_troquelado: product.fuerza_troquelado ?? '',
            medidas_pieza: product.medidas_pieza || '',
            piezas_lamina_4x8: product.piezas_lamina_4x8 || '',
            piezas_lamina_2x1: product.piezas_lamina_2x1 || '',
            empaque_de: product.empaque_de || '',
            pdfFile: undefined,
            stock_minimo: product.stock_minimo ?? '',
            stock_maximo: product.stock_maximo ?? '',
            activo: product.activo ?? true,
            precio_venta: product.precio_venta || '',
            materials: (product.listaMateriales || []).map(m => ({
                materia_prima_id: m.materia_prima_id,
                nombre_mp: m.materiaPrima.nombre_mp,
                cantidad_requerida: m.cantidad_requerida
            }))
        });
        setShowEditModal(true);
    };

    const openCreateModal = () => {
        setNotice(null);
        setNewProductData({ ...initialNewProductState });
        setNewProductImageFile(undefined);
        setNewProductPdfFile(undefined);
        setShowCreateModal(true);
    };

    const handlePrintProduct = async () => {
        if (!selectedProduct) return;

        try {
            const logoResponse = await fetch('/logo.png');
            if (!logoResponse.ok) throw new Error('No se pudo cargar el logotipo corporativo.');
            const logoBlob = await logoResponse.blob();
            const logoDataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => typeof reader.result === 'string'
                    ? resolve(reader.result)
                    : reject(new Error('No se pudo procesar el logotipo corporativo.'));
                reader.onerror = () => reject(reader.error || new Error('No se pudo procesar el logotipo corporativo.'));
                reader.readAsDataURL(logoBlob);
            });

            const product = selectedProduct;
            const doc = new jsPDF({ format: 'a4', unit: 'mm' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const missing = 'No definido';
            const value = (item: unknown) => item === null || item === undefined || item === '' ? missing : String(item);
            const stock = (item: unknown) => item === null || item === undefined || item === '' ? missing : Number(item).toLocaleString('es-CO');

            doc.setProperties({
                title: `Ficha de producto ${product.sku_producto}`,
                subject: 'Ficha técnica de producto',
                author: 'ERP MECAYTRO'
            });
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, pageWidth, 34, 'F');
            doc.addImage(logoDataUrl, 'PNG', 14, 9, 42, 14);
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.text('FICHA TÉCNICA DE PRODUCTO', pageWidth - 14, 15, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text('Código de formato: FP', pageWidth - 14, 22, { align: 'right' });
            doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, pageWidth - 14, 28, { align: 'right' });

            autoTable(doc, {
                startY: 40,
                head: [['IDENTIFICACIÓN Y DATOS TÉCNICOS', 'VALOR']],
                body: [
                    ['Código interno', value(product.id)],
                    ['SKU', value(product.sku_producto)],
                    ['Nombre del producto', value(product.nombre_producto)],
                    ['Descripción', value(product.descripcion)],
                    ['Cliente', value(product.cliente?.nombre)],
                    ['Contacto del cliente', value(product.cliente?.contacto)],
                    ['Dirección del cliente', value(product.cliente?.direccion)],
                    ['Estado', product.activo ? 'Activo' : 'Inactivo'],
                    ['Acabado', value(product.acabado)],
                    ['Ancho de tira (mm)', value(product.ancho_tira)],
                    ['Dimensiones de pieza (mm)', value(product.medidas_pieza)],
                    ['Fuerza de Troquelado (Ton / Peso del golpe requerido)', value(product.fuerza_troquelado)],
                    ['Piezas obtenidas por Lámina 4x8 (ft)', value(product.piezas_lamina_4x8)],
                    ['Piezas obtenidas por Lámina 2x1 (m)', value(product.piezas_lamina_2x1)],
                    ['Empaque de', value(product.empaque_de)],
                    ['Stock actual', stock(product.stock_actual)],
                    ['Stock mínimo', stock(product.stock_minimo)],
                    ['Stock máximo', stock(product.stock_maximo)],
                    ['Precio de venta', `$${Number(product.precio_venta || 0).toLocaleString('es-CO')}`],
                    ['Ubicación', value(product.ubicacion)],
                    ['Imagen del producto', value(product.imagen_url)],
                    ['Plano técnico PDF', value(product.plano_pdf_url)]
                ],
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
                columnStyles: { 0: { cellWidth: 66, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
                margin: { left: 14, right: 14 }
            });

            let materialsStartY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 40) + 10;
            if (materialsStartY > 267) {
                doc.addPage();
                materialsStartY = 20;
            }
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('LISTA DE MATERIALES', 14, materialsStartY);
            autoTable(doc, {
                startY: materialsStartY + 2,
                head: [['Material', 'SKU MP', 'Cantidad requerida', 'Unidad']],
                body: product.listaMateriales?.length
                    ? product.listaMateriales.map(material => [
                        material.materiaPrima?.nombre_mp || value(material.materia_prima_id),
                        value((material.materiaPrima as { sku_mp?: string } | undefined)?.sku_mp),
                        value(material.cantidad_requerida),
                        value(material.materiaPrima?.unidad_medida_stock)
                    ])
                    : [['Sin materiales asociados', '', '', '']],
                headStyles: { fillColor: [37, 99, 235] },
                styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
                margin: { left: 14, right: 14 }
            });

            let routesStartY = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 40) + 10;
            if (routesStartY > 267) {
                doc.addPage();
                routesStartY = 20;
            }
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('PROCESO DE FABRICACIÓN', 14, routesStartY);
            autoTable(doc, {
                startY: routesStartY + 2,
                head: [['No. operación', 'Operación', 'Centro de trabajo', 'Piezas / hora', 'Tiempo estándar']],
                body: product.rutas?.length
                    ? product.rutas.map((route: any) => [
                        value(route.no_operacion),
                        value(route.nombre_operacion),
                        value(route.centro_trabajo),
                        value(route.piezas_por_hora_estimado),
                        value(route.tiempo_estandar)
                    ])
                    : [['', 'Sin operaciones registradas', '', '', '']],
                headStyles: { fillColor: [37, 99, 235] },
                styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
                margin: { left: 14, right: 14 }
            });

            const pageCount = doc.getNumberOfPages();
            for (let page = 1; page <= pageCount; page += 1) {
                doc.setPage(page);
                doc.setDrawColor(203, 213, 225);
                doc.line(14, 286, pageWidth - 14, 286);
                doc.setFontSize(8);
                doc.setTextColor(100, 116, 139);
                doc.text(`FP · ${product.sku_producto}`, 14, 291);
                doc.text(`Página ${page} de ${pageCount}`, pageWidth - 14, 291, { align: 'right' });
            }

            const safeSku = product.sku_producto.replace(/[^\w.-]+/g, '_');
            doc.save(`Ficha_Producto_${safeSku}.pdf`);
        } catch (error) {
            console.error('Error generando la ficha PDF del producto:', error);
            window.alert(error instanceof Error ? error.message : 'No fue posible generar la ficha PDF del producto.');
        }
    };

    useEffect(() => {
        if (!notice) return;

        const timer = window.setTimeout(() => setNotice(null), 3000);
        return () => window.clearTimeout(timer);
    }, [notice]);

    const filteredProducts = products
        .filter(p => (showInactive ? true : p.activo !== false))
        .filter(p => {
            const q = searchTerm.toLowerCase();
            if (!q) return true;
            return p.nombre_producto.toLowerCase().includes(q) || p.sku_producto.toLowerCase().includes(q) || (p.cliente?.nombre && p.cliente.nombre.toLowerCase().includes(q));
        })
        .filter(p => (clientFilter ? String(p.cliente_id) === String(clientFilter) : true))
        .filter(p => (materialFilter ? (p.listaMateriales || []).some((m: any) => m.materiaPrima?.nombre_mp === materialFilter) : true))
        .sort((a, b) => {
            if (!sortByClientAsc) return 0;
            const an = a.cliente?.nombre || '';
            const bn = b.cliente?.nombre || '';
            return an.localeCompare(bn);
        });
    const summaryProductCandidates = products
        .filter(p => p.activo !== false)
        .filter(p => (clientFilter ? String(p.cliente_id) === String(clientFilter) : true));
    const summaryProducts = summaryProductCandidates.slice(0, showMoreSummary ? 20 : 10);

    return (
        <div className="w-full min-w-0 space-y-6 pb-10">
            {productLoadError && (
                <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-semibold">No se pudo cargar el catálogo: {productLoadError}</span>
                    <button type="button" onClick={fetchProducts} className="shrink-0 rounded-lg bg-red-100 px-3 py-2 font-bold text-red-800 transition hover:bg-red-200">
                        Reintentar
                    </button>
                </div>
            )}

            {notice && (
                <div className={`fixed right-5 top-5 z-[140] rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${
                    notice.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                }`}>
                    <div className="flex items-center gap-2 text-sm font-bold">
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-current" />
                        {notice.message}
                    </div>
                </div>
            )}

            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Catálogo de Productos</h1>
                    <p className="text-gray-500 mt-1">Gestiona el inventario de productos terminados y sus rutas de fabricación.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-brand-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-brand-700 transition shadow-lg shadow-brand-100 font-semibold"
                >
                    <Plus className="w-5 h-5" /> Nuevo Producto
                </button>
            </div>

            <div role="tablist" aria-label="Vistas de productos" className="flex w-full max-w-xl gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
                <button
                    role="tab"
                    aria-selected={activeTab === 'dashboard'}
                    onClick={() => setActiveTab('dashboard')}
                    className={clsx('flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold transition sm:text-base', activeTab === 'dashboard' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900')}
                >
                    <LayoutDashboard className="h-5 w-5" /> Dashboard de Inventario
                </button>
                <button
                    role="tab"
                    aria-selected={activeTab === 'catalogo'}
                    onClick={() => setActiveTab('catalogo')}
                    className={clsx('flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-3 text-sm font-bold transition sm:text-base', activeTab === 'catalogo' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900')}
                >
                    <Package className="h-5 w-5" /> Catálogo
                </button>
            </div>

            {activeTab === 'dashboard' && (
            <>
            <section className="min-h-0 min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Productos y existencias</h2>
                        <p className="mt-1 text-sm text-slate-500">Listado de hasta {showMoreSummary ? 20 : 10} productos activos</p>
                    </div>
                    <label className="flex w-full min-w-0 flex-col gap-2 text-sm font-medium text-slate-600 sm:w-auto sm:flex-row sm:items-center">
                        <span>Cliente</span>
                        <select
                            value={clientFilter}
                            onChange={e => setClientFilter(e.target.value)}
                            className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 sm:min-w-48"
                        >
                            <option value="">Todos los clientes</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </label>
                </div>
                <div className="max-h-[70vh] min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y">
                <div className="divide-y divide-slate-100 lg:hidden">
                    {loading ? (
                        <p className="px-4 py-8 text-center text-slate-500">Cargando productos...</p>
                    ) : summaryProducts.length === 0 ? (
                        <p className="px-4 py-8 text-center text-slate-500">No hay productos para este cliente.</p>
                    ) : summaryProducts.map(product => {
                        const materials = Array.from(new Set((product.listaMateriales || []).map(m => m.materiaPrima?.nombre_mp).filter(Boolean)));
                        return (
                            <article key={product.id} className="min-w-0 space-y-2 p-4">
                                <div className="flex min-w-0 items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="break-words font-semibold text-slate-900">{product.nombre_producto}</p>
                                        <p className="mt-1 break-words text-xs text-slate-500">{product.cliente?.nombre || '-'} · {product.sku_producto || '-'}</p>
                                    </div>
                                    <p className="shrink-0 whitespace-nowrap text-sm font-bold text-slate-800">
                                        {Number(product.stock_actual || 0).toLocaleString()} un.
                                    </p>
                                </div>
                                <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-slate-600 min-[400px]:grid-cols-2">
                                    <div><dt className="inline font-semibold">Material: </dt><dd className="inline break-words">{materials.join(', ') || '-'}</dd></div>
                                    <div><dt className="inline font-semibold">Acabado: </dt><dd className="inline break-words">{product.acabado || '-'}</dd></div>
                                    <div className="min-[400px]:col-span-2"><dt className="inline font-semibold">Piezas obtenidas por lámina: </dt><dd className="inline break-words">4×8 (ft): {product.piezas_lamina_4x8 || '-'} | 2×1 (m): {product.piezas_lamina_2x1 || '-'}</dd></div>
                                </dl>
                            </article>
                        );
                    })}
                </div>
                <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full min-w-[1050px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Cliente</th>
                                <th className="px-4 py-3 font-semibold">Código</th>
                                <th className="px-4 py-3 font-semibold">Producto</th>
                                <th className="px-4 py-3 text-right font-semibold">Stock</th>
                                <th className="px-4 py-3 font-semibold">Tipo de material</th>
                                <th className="px-4 py-3 font-semibold">Piezas por lámina</th>
                                <th className="px-4 py-3 font-semibold">Acabado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Cargando productos...</td></tr>
                            ) : summaryProducts.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No hay productos para este cliente.</td></tr>
                            ) : summaryProducts.map(product => {
                                const materials = Array.from(new Set((product.listaMateriales || []).map(m => m.materiaPrima?.nombre_mp).filter(Boolean)));
                                return (
                                    <tr key={product.id} className="hover:bg-slate-50">
                                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{product.cliente?.nombre || '-'}</td>
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-slate-700">{product.sku_producto || '-'}</td>
                                        <td className="px-4 py-3 font-medium text-slate-900">{product.nombre_producto}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-800">{Number(product.stock_actual || 0).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-slate-600">{materials.join(', ') || '-'}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">4×8 (ft): {product.piezas_lamina_4x8 || '-'} <span className="px-1 text-slate-300">|</span> 2×1 (m): {product.piezas_lamina_2x1 || '-'}</td>
                                        <td className="px-4 py-3 text-slate-600">{product.acabado || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                </div>
            </section>
            {summaryProductCandidates.length > 10 && (
                <div className="-mt-4 flex justify-center">
                    <button
                        type="button"
                        onClick={() => setShowMoreSummary(showMore => !showMore)}
                        aria-expanded={showMoreSummary}
                        className="flex items-center gap-2 rounded-b-lg border border-t-0 border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                    >
                        {showMoreSummary ? 'Mostrar solo 10 productos' : 'Ampliar a 20 productos'}
                        {showMoreSummary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                </div>
            )}
            </>
            )}

            {activeTab === 'dashboard' ? (
                <ProductInventoryDashboard
                    onProductSelect={(productId) => {
                        const product = products.find(item => item.id === productId);
                        if (product) {
                            setSearchTerm(product.sku_producto);
                            setActiveTab('catalogo');
                        }
                    }}
                />
            ) : (
                <>

            {/* Search and Filters bar */}
            <div className="flex w-full min-w-0 flex-col items-stretch gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-center">
                <div className="relative w-full min-w-0 lg:flex-1 lg:min-w-[260px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, SKU o cliente..."
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex w-full min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto">
                    <select
                        value={clientFilter}
                        onChange={e => setClientFilter(e.target.value)}
                        className="w-full min-w-0 rounded-xl border bg-gray-50 px-4 py-2 sm:flex-1 sm:min-w-[180px] lg:w-auto lg:flex-none"
                    >
                        <option value="">Todos los clientes</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>

                    <select
                        value={materialFilter}
                        onChange={e => setMaterialFilter(e.target.value)}
                        className="w-full min-w-0 rounded-xl border bg-gray-50 px-4 py-2 sm:flex-1 sm:min-w-[180px] lg:w-auto lg:flex-none"
                    >
                        <option value="">Todos los materiales</option>
                        {allMaterials.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>

                    <button
                        onClick={() => setSortByClientAsc(s => !s)}
                        className="w-full min-w-0 rounded-xl border bg-white px-3 py-2 text-left text-sm sm:w-auto"
                    >
                        Ordenar por cliente: {sortByClientAsc ? 'ASC' : 'OFF'}
                    </button>
                    <label className="flex min-w-0 items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2 sm:w-auto">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(e) => setShowInactive(e.target.checked)}
                            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Mostrar inactivos</span>
                    </label>
                </div>
                <div className="w-full text-right text-sm font-medium text-gray-500 lg:ml-auto lg:w-auto">
                    Mostrando <strong>{filteredProducts.length}</strong> productos
                </div>
            </div>

            {/* Products Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="bg-white rounded-2xl h-[380px] animate-pulse border border-gray-100"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map((product) => (
                        <div
                            key={product.id}
                            className="group bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col relative"
                            onClick={() => { setSelectedProduct(product); setShowDetailModal(true); }}
                        >
                            {/* Card Header: Name and Stock */}
                            <div className="p-5 flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2">{product.nombre_producto}</h3>
                                    <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">{product.sku_producto}</span>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="bg-brand-50 text-brand-700 px-3 py-1.5 rounded-xl font-bold text-sm flex items-center gap-1.5 border border-brand-100">
                                        <Package className="w-4 h-4" />
                                        {product.stock_actual.toLocaleString()}
                                    </div>
                                    {!product.activo && (
                                        <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border border-gray-200">
                                            Oculto
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Product Image */}
                            <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden mx-4 rounded-2xl flex items-center justify-center">
                                {product.imagen_url ? (
                                    <img
                                        src={getAssetUrl(product.imagen_url)}
                                        alt={product.nombre_producto}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        onError={(e) => {
                                            (e.target as any).src = 'https://placehold.co/400x300?text=Sin+Imagen';
                                        }}
                                    />
                                ) : (
                                    <Box className="w-16 h-16 text-gray-200" />
                                )}
                            </div>

                            {/* Info Section */}
                            <div className="p-5 space-y-3 flex-1">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="font-medium truncate">{product.cliente?.nombre || 'Sin cliente'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Tag className="w-4 h-4 text-gray-400" />
                                    <span className="truncate">{product.acabado || 'Sin acabado'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    <span className="truncate">{product.ancho_tira || 'Sin ancho'}</span>
                                </div>
                            </div>

                            {/* Action Buttons Footer */}
                            <div className="p-4 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => { setSelectedProduct(product); setShowOTModal(true); }}
                                    className="text-brand-600 bg-white border border-brand-100 hover:bg-brand-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex-1 flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    CREAR NUEVA OT
                                </button>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => { setSelectedProduct(product); setShowStockModal(true); }}
                                        className="p-2 text-gray-500 hover:bg-white hover:text-gray-900 rounded-lg border border-transparent hover:border-gray-100 transition whitespace-nowrap"
                                        title="Movimiento Stock"
                                    >
                                        <ArrowUpDown className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => openRouteModal(product)}
                                        className="p-2 text-brand-500 hover:bg-white hover:text-brand-900 rounded-lg border border-transparent hover:border-brand-100 transition"
                                        title="Definir Ruta"
                                    >
                                        <Activity className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => { setSelectedProduct(product); fetchMovements(product.id); }}
                                        className="p-2 text-gray-500 hover:bg-white hover:text-gray-900 rounded-lg border border-transparent hover:border-gray-100 transition"
                                        title="Ver Historial (Kardex)"
                                    >
                                        <History className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => openEditModal(product)}
                                        className="p-2 text-gray-500 hover:bg-white hover:text-gray-900 rounded-lg border border-transparent hover:border-gray-100 transition"
                                        title="Editar"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => { setSelectedProduct(product); handleDeleteProduct(); }}
                                        className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-lg border border-transparent hover:border-red-100 transition"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

                </>
            )}

            {/* All other modals (Detail, Stock, OT, Edit) go here... */}

            <SideDrawer
                open={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                title="Crear nuevo producto"
                description="Completa la información base del producto y guarda los cambios sin recargar la página."
                size="lg"
            >
                <form onSubmit={handleCreateProduct} className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Nombre del Producto</label>
                            <input
                                type="text"
                                required
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={newProductData.nombre_producto}
                                onChange={e => setNewProductData({ ...newProductData, nombre_producto: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">SKU</label>
                            <input
                                type="text"
                                required
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={newProductData.sku_producto}
                                onChange={e => setNewProductData({ ...newProductData, sku_producto: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Cliente</label>
                            <select
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={newProductData.cliente_id}
                                onChange={e => setNewProductData({ ...newProductData, cliente_id: e.target.value })}
                            >
                                <option value="">Seleccionar Cliente</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Acabado</label>
                            <input
                                type="text"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={newProductData.acabado}
                                onChange={e => setNewProductData({ ...newProductData, acabado: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Ancho Tira (mm)</label>
                            <input
                                type="number"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={newProductData.ancho_tira}
                                onChange={e => setNewProductData({ ...newProductData, ancho_tira: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Dimensiones (mm)</label>
                            <input
                                type="text"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={newProductData.medidas_pieza}
                                onChange={e => setNewProductData({ ...newProductData, medidas_pieza: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Fuerza de Troquelado (Ton / Peso del golpe requerido)</label>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={newProductData.fuerza_troquelado}
                                onChange={e => setNewProductData({ ...newProductData, fuerza_troquelado: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Piezas obtenidas por Lámina 4x8 (ft)</label>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={newProductData.piezas_lamina_4x8}
                                onChange={e => setNewProductData({ ...newProductData, piezas_lamina_4x8: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Piezas obtenidas por Lámina 2x1 (m)</label>
                            <input
                                type="number"
                                min="0"
                                step="1"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={newProductData.piezas_lamina_2x1}
                                onChange={e => setNewProductData({ ...newProductData, piezas_lamina_2x1: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Empaque de</label>
                            <input
                                type="text"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={newProductData.empaque_de}
                                onChange={e => setNewProductData({ ...newProductData, empaque_de: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Precio de Venta</label>
                            <input
                                type="number"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={newProductData.precio_venta}
                                onChange={e => setNewProductData({ ...newProductData, precio_venta: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Stock Mínimo</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={newProductData.stock_minimo}
                                onChange={e => setNewProductData({ ...newProductData, stock_minimo: e.target.value })}
                                placeholder="Sin parametrizar"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Stock Máximo</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={newProductData.stock_maximo}
                                onChange={e => setNewProductData({ ...newProductData, stock_maximo: e.target.value })}
                                placeholder="Sin parametrizar"
                            />
                        </div>
                        <div className="sm:col-span-2" onPaste={(event) => handleImagePasteFromClipboard(event, (file) => setNewProductImageFile(file))}>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Imagen del Producto (opcional) · Ctrl + V para pegar</label>
                            {newProductImageFile && (
                                <div className="relative mb-2 h-28 w-full overflow-hidden rounded-xl border border-slate-200">
                                    <img src={URL.createObjectURL(newProductImageFile)} className="h-full w-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setNewProductImageFile(undefined)}
                                        className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white"
                                        aria-label="Quitar imagen seleccionada"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                                {Capacitor.isNativePlatform() && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            const file = await capturePhotoFromCamera('producto');
                                            if (file) setNewProductImageFile(file);
                                        }}
                                        className="flex items-center justify-center gap-2 rounded-xl border-2 border-blue-100 bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-600 transition hover:border-blue-400"
                                    >
                                        <Camera className="h-4 w-4" /> Tomar Foto
                                    </button>
                                )}
                                {Capacitor.isNativePlatform() && <button
                                    type="button"
                                    onClick={async () => {
                                        const file = await pickPhotoFromGallery('producto');
                                        if (file) setNewProductImageFile(file);
                                    }}
                                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-500 transition hover:border-brand-500"
                                >
                                    <ImageIcon className="h-4 w-4" /> {newProductImageFile ? 'Cambiar' : 'Galería'}
                                </button>}
                            </div>
                            {!Capacitor.isNativePlatform() && (
                                <>
                                    <input
                                        type="file"
                                        id="new-product-image"
                                        accept="image/*"
                                        onChange={e => setNewProductImageFile(e.target.files?.[0])}
                                        className="hidden"
                                    />
                                    <label htmlFor="new-product-image" className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 transition hover:border-brand-500">
                                        <Upload className="h-4 w-4" /> Subir Imagen
                                    </label>
                                </>
                            )}
                        </div>
                        <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
                            <label htmlFor="new-product-pdf" className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-500">Plano técnico PDF (opcional)</label>
                            <input
                                type="file"
                                id="new-product-pdf"
                                accept="application/pdf,.pdf"
                                onChange={e => {
                                    const input = e.currentTarget;
                                    const file = input.files?.[0];
                                    input.value = '';
                                    if (!file) return;
                                    if (!isProductPdf(file)) {
                                        setNotice({ type: 'error', message: 'Selecciona un archivo PDF válido.' });
                                        return;
                                    }
                                    if (file.size > MAX_PRODUCT_PDF_SIZE) {
                                        setNotice({ type: 'error', message: 'El plano PDF no puede superar 24 MB.' });
                                        return;
                                    }
                                    setNewProductPdfFile(file);
                                    setNotice(null);
                                }}
                                className="block w-full cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-2 file:text-xs file:font-bold file:text-brand-700"
                            />
                            {newProductPdfFile && (
                                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
                                    <span className="flex min-w-0 items-center gap-2 truncate"><FileText className="h-4 w-4 shrink-0" />{newProductPdfFile.name}</span>
                                    <button type="button" onClick={() => setNewProductPdfFile(undefined)} className="shrink-0 rounded-lg p-1 text-red-600 hover:bg-red-100" aria-label="Quitar plano PDF"><X className="h-4 w-4" /></button>
                                </div>
                            )}
                            <p className="mt-2 text-xs text-slate-500">El plano se guarda en el almacenamiento local del servidor. Tamaño máximo: 24 MB.</p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(false)}
                            className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200"
                        >
                            CANCELAR
                        </button>
                        <button
                            type="submit"
                            disabled={isCreatingProduct}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-brand-100 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-75"
                        >
                            {isCreatingProduct ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    CREANDO...
                                </>
                            ) : (
                                'CREAR PRODUCTO'
                            )}
                        </button>
                    </div>
                </form>
            </SideDrawer>

            {/* Other modals here... */}
            {showDetailModal && selectedProduct && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
                    <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
                        <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-brand-800 p-5 text-white sm:p-7">
                            <div className="flex items-center gap-6">
                                <div className="bg-brand-600 p-4 rounded-3xl">
                                    <Package className="w-10 h-10" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black">{selectedProduct.nombre_producto}</h2>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">SKU: {selectedProduct.sku_producto} • Estado: {selectedProduct.activo ? 'ACTIVO' : 'INACTIVO'}</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={handlePrintProduct} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-black text-xs text-brand-700 transition hover:bg-brand-50">
                                    <FileText className="w-4 h-4" /> DESCARGAR FICHA PDF
                                </button>
                                <button onClick={() => setShowDetailModal(false)} className="rounded-full bg-white/10 p-3 transition hover:bg-white/20" aria-label="Cerrar ficha"><X /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-slate-50/70 p-5 sm:p-8 lg:p-10">
                            <div className="flex flex-col md:flex-row gap-10">
                                <div className="w-full md:w-1/2 aspect-square rounded-3xl bg-gray-100 overflow-hidden print:w-1/3 print:aspect-auto print:rounded-none print:bg-white print:overflow-visible print:break-inside-avoid">
                                    {selectedProduct.imagen_url ? (
                                        <img src={getAssetUrl(selectedProduct.imagen_url)} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><Box className="w-24 h-24 text-gray-200" /></div>
                                    )}
                                </div>
                                <div className="w-full md:w-1/2 space-y-8">
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Stock Actual</span>
                                            <span className="text-2xl font-black text-brand-600">{selectedProduct.stock_actual}</span>
                                        </div>
                                        <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Precio de Venta</span>
                                            <span className="text-2xl font-black text-green-600">${selectedProduct.precio_venta?.toLocaleString() || '0'}</span>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Ancho Tira (mm)</span>
                                            <span className="text-lg font-bold text-gray-700">{selectedProduct.ancho_tira || 'No definida'}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <span className="text-gray-500 font-medium flex items-center gap-2"><User className="w-4 h-4" /> Cliente:</span>
                                            <span className="font-bold">{selectedProduct.cliente?.nombre || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <span className="text-gray-500 font-medium flex items-center gap-2"><MapPin className="w-4 h-4" /> Ancho Tira:</span>
                                            <span className="font-bold">{selectedProduct.ancho_tira || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <span className="text-gray-500 font-medium flex items-center gap-2"><Tag className="w-4 h-4" /> Acabado:</span>
                                            <span className="font-bold">{selectedProduct.acabado || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <span className="text-gray-500 font-medium flex items-center gap-2"><Layers className="w-4 h-4" /> Dimensiones:</span>
                                            <span className="font-bold">{selectedProduct.medidas_pieza || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <span className="text-gray-500 font-medium flex items-center gap-2"><Activity className="w-4 h-4" /> Fuerza de Troquelado:</span>
                                            <span className="font-bold">{selectedProduct.fuerza_troquelado !== null && selectedProduct.fuerza_troquelado !== undefined ? `${selectedProduct.fuerza_troquelado} Ton` : 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-b pb-2 text-blue-600">
                                            <span className="text-gray-500 font-medium flex items-center gap-2"><Activity className="w-4 h-4" /> Piezas/Hora:</span>
                                            <span className="font-black">{selectedProduct.rutas && selectedProduct.rutas.length > 0 ? selectedProduct.rutas[0]?.piezas_por_hora_estimado : 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex flex-col items-center text-center">
                                            <span className="text-[10px] font-black text-blue-400 uppercase">Piezas obtenidas por Lámina 4x8 (ft)</span>
                                            <span className="text-lg font-black text-blue-700">{selectedProduct.piezas_lamina_4x8 || '-'}</span>
                                        </div>
                                        <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100 flex flex-col items-center text-center">
                                            <span className="text-[10px] font-black text-purple-400 uppercase">Piezas obtenidas por Lámina 2x1 (m)</span>
                                            <span className="text-lg font-black text-purple-700">{selectedProduct.piezas_lamina_2x1 || '-'}</span>
                                        </div>
                                    </div>

                                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex justify-between items-center">
                                        <div>
                                            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest block mb-1">Empaque de</span>
                                            <span className="text-md font-bold text-orange-700">{selectedProduct.empaque_de || 'No definido'}</span>
                                        </div>
                                        {selectedProduct.plano_pdf_url && (
                                            <button
                                                onClick={() => setShowPDFModal(true)}
                                                className="bg-brand-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-brand-700 transition"
                                            >
                                                <FileText className="w-4 h-4" /> VER PLANO PDF
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest">Materiales (BoM)</h4>
                                        <div className="space-y-2">
                                            {selectedProduct.listaMateriales && selectedProduct.listaMateriales.map((m: any) => (
                                                <div key={m.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                    <span className="text-sm font-semibold">{m.materiaPrima.nombre_mp}</span>
                                                    <span className="bg-white px-3 py-1 rounded-lg text-xs font-black border border-gray-100">
                                                        {m.cantidad_requerida} {m.materiaPrima.unidad_medida_stock}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* PROCEDIMIENTO DETALLADO DE FABRICACIÓN */}
                            <div className="mt-8 pt-8 border-t-2 border-gray-100 print:border-gray-900 print:mt-4 print:pt-4">
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest mb-6">Procedimiento Detallado de Fabricación</h3>
                                {selectedProduct.rutas && selectedProduct.rutas.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-100 print:bg-gray-200">
                                                    <th className="p-3 border border-gray-200 font-black text-xs uppercase text-gray-600">No. Operación</th>
                                                    <th className="p-3 border border-gray-200 font-black text-xs uppercase text-gray-600">Operación</th>
                                                    <th className="p-3 border border-gray-200 font-black text-xs uppercase text-gray-600">Centro de Trabajo</th>
                                                    <th className="p-3 border border-gray-200 font-black text-xs uppercase text-gray-600">Pzs/Hora Est.</th>
                                                    <th className="p-3 border border-gray-200 font-black text-xs uppercase text-gray-600">Verificado Por</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedProduct.rutas
                                                    .sort((a: any, b: any) => a.no_operacion - b.no_operacion)
                                                    .map((ruta: any) => (
                                                        <tr key={ruta.id} className="print:break-inside-avoid">
                                                            <td className="p-3 border border-gray-200 font-bold">{ruta.no_operacion}</td>
                                                            <td className="p-3 border border-gray-200 font-bold">{ruta.nombre_operacion}</td>
                                                            <td className="p-3 border border-gray-200 text-gray-600">{ruta.centro_trabajo}</td>
                                                            <td className="p-3 border border-gray-200 font-mono text-center">{ruta.piezas_por_hora_estimado || '-'}</td>
                                                            <td className="p-3 border border-gray-200 w-32 border-b-2 border-b-gray-400"></td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                        <div className="hidden print:block mt-8 p-4 border border-gray-400 rounded-lg">
                                            <p className="text-xs font-bold text-gray-500 uppercase mb-4">Aprobación de Calidad</p>
                                            <div className="flex justify-between items-end mt-12">
                                                <div className="w-64 border-b border-gray-600 text-center pb-2">Firma Supervisor</div>
                                                <div className="w-64 border-b border-gray-600 text-center pb-2">Firma Calidad</div>
                                                <div className="w-48 border-b border-gray-600 text-center pb-2">Fecha</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic">No hay rutas de fabricación definidas para este producto.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showStockModal && selectedProduct && (
                <SideDrawer
                    open={showStockModal}
                    onClose={() => setShowStockModal(false)}
                    title="Ajustar stock"
                    description={`Registra una entrada o salida para ${selectedProduct.nombre_producto}.`}
                    size="md"
                >
                    <form onSubmit={handleStockAdjustment} className="space-y-6">
                        <div className="flex p-1 bg-gray-100 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setStockType('entrada')}
                                className={clsx(
                                    "flex-1 py-2.5 rounded-lg text-sm font-bold transition",
                                    stockType === 'entrada' ? "bg-white text-green-600 shadow-sm" : "text-gray-400"
                                )}
                            >
                                ENTRADA (+)
                            </button>
                            <button
                                type="button"
                                onClick={() => setStockType('salida')}
                                className={clsx(
                                    "flex-1 py-2.5 rounded-lg text-sm font-bold transition",
                                    stockType === 'salida' ? "bg-white text-red-600 shadow-sm" : "text-gray-400"
                                )}
                            >
                                SALIDA (-)
                            </button>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Cantidad de Piezas</label>
                            <input
                                type="number"
                                required
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xl font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={stockQty}
                                onChange={e => setStockQty(e.target.value)}
                                placeholder="0"
                            />
                        </div>

                        <button type="submit" className="w-full rounded-2xl bg-brand-600 px-4 py-4 text-lg font-black text-white shadow-lg shadow-brand-100 transition hover:bg-brand-700">
                            CONFIRMAR MOVIMIENTO
                        </button>
                    </form>
                </SideDrawer>
            )}

            {showOTModal && selectedProduct && (
                <SideDrawer
                    open={showOTModal}
                    onClose={() => {
                        setShowOTModal(false);
                        setOtQty('');
                        setOtDate('');
                        setSheetQty('');
                    }}
                    title="Lanzar producción"
                    description={`Crea una orden para ${selectedProduct.nombre_producto}.`}
                    size="md"
                >
                    <div className="mb-6 flex items-center gap-4 rounded-2xl border border-brand-100 bg-brand-50 p-4">
                        <div className="h-16 w-16 overflow-hidden rounded-xl bg-white shrink-0">
                            <img src={selectedProduct.imagen_url ? getAssetUrl(selectedProduct.imagen_url) : ''} className="h-full w-full object-cover" />
                        </div>
                        <div>
                            <h4 className="font-bold text-brand-900 line-clamp-1">{selectedProduct.nombre_producto}</h4>
                            <p className="text-xs font-medium uppercase tracking-wide text-brand-600">{selectedProduct.cliente?.nombre}</p>
                        </div>
                    </div>

                    <form onSubmit={handleCreateOT} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Número de láminas</label>
                                <input
                                    type="number"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                    value={sheetQty}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setSheetQty(val);
                                        if (val) {
                                            const piezasXlaminaStr = sheetType === '4x8' ? selectedProduct?.piezas_lamina_4x8 : selectedProduct?.piezas_lamina_2x1;
                                            const factor = parseInt(piezasXlaminaStr?.replace(/[^0-9]/g, '') || '0');
                                            if (factor > 0) {
                                                setOtQty((parseInt(val) * factor).toString());
                                            }
                                        }
                                    }}
                                    placeholder="Opcional"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Tipo Lámina</label>
                                <select
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                    value={sheetType}
                                    onChange={e => {
                                        const newType = e.target.value as '4x8' | '2x1';
                                        setSheetType(newType);
                                        if (sheetQty) {
                                            const piezasXlaminaStr = newType === '4x8' ? selectedProduct?.piezas_lamina_4x8 : selectedProduct?.piezas_lamina_2x1;
                                            const factor = parseInt(piezasXlaminaStr?.replace(/[^0-9]/g, '') || '0');
                                            if (factor > 0) {
                                                setOtQty((parseInt(sheetQty) * factor).toString());
                                            }
                                        }
                                    }}
                                >
                                    <option value="4x8">4' x 8' ({selectedProduct?.piezas_lamina_4x8 || '?'})</option>
                                    <option value="2x1">2' x 1' ({selectedProduct?.piezas_lamina_2x1 || '?'})</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Cantidad a fabricar</label>
                            <input
                                type="number"
                                required
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={otQty}
                                onChange={e => setOtQty(e.target.value)}
                                placeholder="Cantidad"
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Fecha Estimada Entrega</label>
                            <input
                                type="date"
                                required
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                value={otDate}
                                onChange={e => setOtDate(e.target.value)}
                            />
                        </div>

                        <button type="submit" className="w-full rounded-2xl bg-brand-600 px-4 py-4 text-lg font-black text-white shadow-lg shadow-brand-100 transition hover:bg-brand-700">
                            LANZAR PRODUCCIÓN
                        </button>
                    </form>
                </SideDrawer>
            )}

            {showEditModal && selectedProduct && (
                <SideDrawer
                    open={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    title="Editar producto"
                    description="Actualiza los datos principales, imagen y materiales del producto."
                    size= "lg"
                >
                    <form onSubmit={handleEditProduct} className="space-y-6">
                        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center gap-3">
                                <div className={clsx("h-3 w-3 rounded-full", editData.activo ? "bg-green-500" : "bg-gray-300")}></div>
                                <span className="font-bold text-slate-700">{editData.activo ? "Producto Visible" : "Producto Oculto"}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditData({ ...editData, activo: !editData.activo })}
                                className={clsx(
                                    "rounded-xl px-4 py-2 text-xs font-black transition",
                                    editData.activo ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-green-100 text-green-600 hover:bg-green-200"
                                )}
                            >
                                {editData.activo ? "OCULTAR PRODUCTO" : "MOSTRAR PRODUCTO"}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Nombre del Producto</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                    value={editData.nombre_producto}
                                    onChange={e => setEditData({ ...editData, nombre_producto: e.target.value })}
                                />
                            </div>

                            <div className="sm:col-span-2" onPaste={(event) => handleImagePasteFromClipboard(event, (file) => setEditData({ ...editData, imageFile: file }))}>
                                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Imagen del Producto · Ctrl + V para pegar</label>
                                {editData.imageFile && (
                                    <div className="relative mb-2 h-24 w-full overflow-hidden rounded-xl border border-slate-200">
                                        <img src={URL.createObjectURL(editData.imageFile)} className="h-full w-full object-cover" />
                                        <button type="button" onClick={() => setEditData({ ...editData, imageFile: undefined })} className="absolute right-1 top-1 rounded-full bg-red-500 p-0.5 text-white">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                    {Capacitor.isNativePlatform() && (
                                        <button
                                            type="button"
                                            onClick={async () => { const f = await capturePhotoFromCamera('producto'); if (f) setEditData({ ...editData, imageFile: f }); }}
                                            className="flex items-center justify-center gap-2 rounded-xl border-2 border-blue-100 bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-600 transition hover:border-blue-400"
                                        >
                                            <Camera className="h-4 w-4" /> Tomar Foto
                                        </button>
                                    )}
                                    {Capacitor.isNativePlatform() && <button
                                        type="button"
                                        onClick={async () => { const f = await pickPhotoFromGallery('producto'); if (f) setEditData({ ...editData, imageFile: f }); }}
                                        className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-500 transition hover:border-brand-500"
                                    >
                                        <ImageIcon className="h-4 w-4" /> {editData.imageFile ? 'Cambiar' : 'Galería'}
                                    </button>}
                                </div>
                                {!Capacitor.isNativePlatform() && (
                                    <>
                                        <input type="file" id="product-image" accept="image/*" onChange={e => setEditData({ ...editData, imageFile: e.target.files ? e.target.files[0] : undefined })} className="hidden" />
                                        <label htmlFor="product-image" className="mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 transition hover:border-brand-500">
                                            <Upload className="h-4 w-4" /> Subir Imagen
                                        </label>
                                    </>
                                )}
                            </div>
                            <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
                                <label htmlFor="edit-product-pdf" className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-500">Plano técnico PDF</label>
                                {selectedProduct.plano_pdf_url && (
                                    <a
                                        href={getAssetUrl(selectedProduct.plano_pdf_url)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mb-3 inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                                    >
                                        <FileText className="h-4 w-4" /> Ver plano guardado
                                    </a>
                                )}
                                <input
                                    type="file"
                                    id="edit-product-pdf"
                                    accept="application/pdf,.pdf"
                                    onChange={e => {
                                        const input = e.currentTarget;
                                        const file = input.files?.[0];
                                        input.value = '';
                                        if (!file) return;
                                        if (!isProductPdf(file)) {
                                            setNotice({ type: 'error', message: 'Selecciona un archivo PDF válido.' });
                                            return;
                                        }
                                        if (file.size > MAX_PRODUCT_PDF_SIZE) {
                                            setNotice({ type: 'error', message: 'El plano PDF no puede superar 24 MB.' });
                                            return;
                                        }
                                        setEditData({ ...editData, pdfFile: file });
                                        setNotice(null);
                                    }}
                                    className="block w-full cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-2 file:text-xs file:font-bold file:text-brand-700"
                                />
                                {editData.pdfFile && (
                                    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
                                        <span className="flex min-w-0 items-center gap-2 truncate"><FileText className="h-4 w-4 shrink-0" />{editData.pdfFile.name}</span>
                                        <button type="button" onClick={() => setEditData({ ...editData, pdfFile: undefined })} className="shrink-0 rounded-lg p-1 text-red-600 hover:bg-red-100" aria-label="Quitar plano PDF"><X className="h-4 w-4" /></button>
                                    </div>
                                )}
                                <p className="mt-2 text-xs text-slate-500">El archivo nuevo reemplaza el plano asociado y se guarda localmente en el servidor (máximo 24 MB).</p>
                            </div>

                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">SKU</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                    value={editData.sku_producto}
                                    onChange={e => setEditData({ ...editData, sku_producto: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Cliente</label>
                                <select
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                    value={editData.cliente_id}
                                    onChange={e => setEditData({ ...editData, cliente_id: e.target.value })}
                                >
                                    <option value="">Seleccionar Cliente</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Acabado</label>
                                <input
                                    type="text"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                    value={editData.acabado}
                                    onChange={e => setEditData({ ...editData, acabado: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Ancho Tira (mm)</label>
                                <input
                                    type="text"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                    value={editData.ancho_tira}
                                    onChange={e => setEditData({ ...editData, ancho_tira: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Dimensiones (mm)</label>
                                <input
                                    type="text"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                    value={editData.medidas_pieza}
                                    onChange={e => setEditData({ ...editData, medidas_pieza: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Fuerza de Troquelado (Ton / Peso del golpe requerido)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                    value={editData.fuerza_troquelado}
                                    onChange={e => setEditData({ ...editData, fuerza_troquelado: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Piezas obtenidas por Lámina 4x8 (ft)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                    value={editData.piezas_lamina_4x8}
                                    onChange={e => setEditData({ ...editData, piezas_lamina_4x8: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Piezas obtenidas por Lámina 2x1 (m)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                    value={editData.piezas_lamina_2x1}
                                    onChange={e => setEditData({ ...editData, piezas_lamina_2x1: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Empaque de</label>
                                <input
                                    type="text"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                    value={editData.empaque_de}
                                    onChange={e => setEditData({ ...editData, empaque_de: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Precio de Venta</label>
                                <input
                                    type="number"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                    value={editData.precio_venta}
                                    onChange={e => setEditData({ ...editData, precio_venta: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Stock Mínimo</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                    value={editData.stock_minimo}
                                    onChange={e => setEditData({ ...editData, stock_minimo: e.target.value })}
                                    placeholder="Sin parametrizar"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Stock Máximo</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                                    value={editData.stock_maximo}
                                    onChange={e => setEditData({ ...editData, stock_maximo: e.target.value })}
                                    placeholder="Sin parametrizar"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 border-t border-slate-200 pt-6">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400">Materiales Requeridos</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const firstMP = allMateriaPrima[0];
                                        if (firstMP) {
                                            setEditData({
                                                ...editData,
                                                materials: [...(editData.materials || []), { materia_prima_id: firstMP.id, nombre_mp: firstMP.nombre_mp, cantidad_requerida: 1 }]
                                            });
                                        }
                                    }}
                                    className="text-xs font-black text-brand-600 hover:underline"
                                >
                                    + AGREGAR MATERIAL
                                </button>
                            </div>
                            <div className="space-y-2">
                                {(editData.materials || []).map((m: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                        <select
                                            className="flex-1 bg-transparent text-sm font-bold text-slate-800 outline-none"
                                            value={m.materia_prima_id}
                                            onChange={e => {
                                                const newMats = [...editData.materials];
                                                newMats[idx].materia_prima_id = Number(e.target.value);
                                                setEditData({ ...editData, materials: newMats });
                                            }}
                                        >
                                            {allMateriaPrima.map(mp => (
                                                <option key={mp.id} value={mp.id}>{mp.nombre_mp} ({mp.sku_mp})</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            className="w-20 rounded border border-slate-200 bg-white px-2 py-1 text-center text-sm font-bold text-slate-800"
                                            value={m.cantidad_requerida}
                                            onChange={e => {
                                                const newMats = [...editData.materials];
                                                newMats[idx].cantidad_requerida = e.target.value;
                                                setEditData({ ...editData, materials: newMats });
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newMats = editData.materials.filter((_: any, i: number) => i !== idx);
                                                setEditData({ ...editData, materials: newMats });
                                            }}
                                            className="rounded p-1 text-red-500 transition hover:bg-red-100"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200"
                            >
                                CANCELAR
                            </button>
                            <button
                                type="submit"
                                className="flex-1 rounded-xl bg-brand-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-brand-100 transition hover:bg-brand-700"
                            >
                                GUARDAR CAMBIOS
                            </button>
                        </div>
                    </form>
                </SideDrawer>
            )}

            {/* PDF VIEWER MODAL */}
            {showPDFModal && selectedProduct && selectedProduct.plano_pdf_url && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[80] flex flex-col p-4">
                    <div className="flex justify-between items-center text-white mb-4 px-4">
                        <div>
                            <h3 className="text-xl font-black">Plano: {selectedProduct.nombre_producto}</h3>
                            <p className="text-xs font-mono text-gray-400">{selectedProduct.sku_producto}</p>
                        </div>
                        <button
                            onClick={() => setShowPDFModal(false)}
                            className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition"
                        >
                            <X className="w-8 h-8" />
                        </button>
                    </div>
                    <div className="flex-1 bg-white rounded-3xl overflow-hidden relative flex flex-col">
                        <iframe
                            src={getAssetUrl(selectedProduct.plano_pdf_url)}
                            className="w-full h-full border-none flex-1"
                            title="Plano PDF"
                        />
                        <div className="p-4 bg-gray-50 flex justify-center border-t border-gray-100">
                            <a
                                href={getAssetUrl(selectedProduct.plano_pdf_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-700 transition flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                Descargar o Ver Pantalla Completa
                            </a>
                        </div>
                    </div>
                </div>
            )}
            {/* KARDEX MODAL */}
            {showKardexModal && selectedProduct && (
                <SideDrawer
                    open={showKardexModal}
                    onClose={() => setShowKardexModal(false)}
                    title="Historial de movimientos"
                    description={selectedProduct.nombre_producto}
                    size="md"
                >
                    <div className="space-y-3">
                        {movements.length === 0 ? (
                            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 py-20 text-center">
                                <Package className="mx-auto mb-3 h-12 w-12 text-slate-200" />
                                <p className="font-bold text-slate-400">No hay movimientos registrados para este producto.</p>
                            </div>
                        ) : (
                            movements.map((m) => (
                                <div key={m.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 transition-colors hover:border-brand-200">
                                    <div className="flex items-center gap-4">
                                        <div className={clsx(
                                            "flex h-10 w-10 items-center justify-center rounded-xl",
                                            m.tipo_movimiento === 'entrada' ? "bg-green-50 text-green-600" :
                                                m.tipo_movimiento === 'salida' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                                        )}>
                                            {m.tipo_movimiento === 'entrada' ? <Plus className="h-5 w-5" /> :
                                                m.tipo_movimiento === 'salida' ? <X className="h-5 w-5" /> : <ArrowUpDown className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={clsx(
                                                    "rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-widest",
                                                    m.tipo_movimiento === 'entrada' ? "bg-green-100 text-green-700" :
                                                        m.tipo_movimiento === 'salida' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                                                )}>
                                                    {m.tipo_movimiento}
                                                </span>
                                                <span className="text-xs font-bold text-slate-400">{new Date(m.fecha).toLocaleString()}</span>
                                            </div>
                                            <p className="mt-1 text-sm font-bold text-slate-700">{m.referencia || 'Ajuste de inventario'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={clsx(
                                            "text-lg font-black",
                                            m.tipo_movimiento === 'entrada' ? "text-green-600" :
                                                m.tipo_movimiento === 'salida' ? "text-red-600" : "text-blue-600"
                                        )}>
                                            {m.tipo_movimiento === 'salida' ? '-' : '+'}{m.cantidad}
                                        </span>
                                        <p className="text-[10px] font-bold uppercase tracking-tight text-slate-300">Piezas</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </SideDrawer>
            )}

            {/* ROUTE MODAL */}
            {showRouteModal && selectedProduct && (
                <SideDrawer
                    open={showRouteModal}
                    onClose={() => setShowRouteModal(false)}
                    title="Ruta de producción"
                    description={`${selectedProduct.nombre_producto} • SKU: ${selectedProduct.sku_producto}`}
                    size="lg"
                >
                    <form onSubmit={handleUpdateRoutes} className="space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-12 gap-4 rounded-xl bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <div className="col-span-1">No.</div>
                                <div className="col-span-4">Operación</div>
                                <div className="col-span-3">Centro</div>
                                <div className="col-span-2">Pzs/Hora</div>
                                <div className="col-span-1">T. Est</div>
                                <div className="col-span-1 text-center">Acción</div>
                            </div>

                            <div className="space-y-3">
                                {routesData.map((r, idx) => (
                                    <div key={idx} className="grid grid-cols-12 items-center gap-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-brand-200">
                                        <div className="col-span-1 text-center font-mono text-sm font-bold text-brand-600">{r.no}</div>
                                        <div className="col-span-4">
                                            <input
                                                type="text"
                                                required
                                                className="w-full rounded-xl border-none bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 outline-none transition focus:ring-2 focus:ring-brand-100"
                                                value={r.nombre}
                                                onChange={e => {
                                                    const newRoutes = [...routesData];
                                                    newRoutes[idx].nombre = e.target.value;
                                                    setRoutesData(newRoutes);
                                                }}
                                                placeholder="Ej: Corte, Troquelado..."
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <input
                                                type="text"
                                                required
                                                className="w-full rounded-xl border-none bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 outline-none transition focus:ring-2 focus:ring-brand-100"
                                                value={r.centro}
                                                onChange={e => {
                                                    const newRoutes = [...routesData];
                                                    newRoutes[idx].centro = e.target.value;
                                                    setRoutesData(newRoutes);
                                                }}
                                                placeholder="Ej: Cizalla, Prensa..."
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                className="w-full rounded-xl border-none bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 outline-none transition focus:ring-2 focus:ring-brand-100"
                                                value={r.piezas_hora}
                                                onChange={e => {
                                                    const newRoutes = [...routesData];
                                                    newRoutes[idx].piezas_hora = e.target.value;
                                                    setRoutesData(newRoutes);
                                                }}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-full rounded-xl border-none bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800 outline-none transition focus:ring-2 focus:ring-brand-100"
                                                value={r.tiempo_estandar}
                                                onChange={e => {
                                                    const newRoutes = [...routesData];
                                                    newRoutes[idx].tiempo_estandar = e.target.value;
                                                    setRoutesData(newRoutes);
                                                }}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="col-span-1 text-center">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newRoutes = routesData.filter((_, i) => i !== idx);
                                                    setRoutesData(newRoutes);
                                                }}
                                                className="rounded-xl p-2 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    const lastNo = routesData.length > 0 ? routesData[routesData.length - 1].no : 0;
                                    setRoutesData([...routesData, { id: undefined, no: lastNo + 10, nombre: '', centro: '', piezas_hora: '', tiempo_estandar: '' }]);
                                }}
                                className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-4 font-black text-slate-400 transition hover:border-brand-500 hover:text-brand-600"
                            >
                                <Plus className="h-5 w-5" /> AGREGAR OPERACIÓN A LA RUTA
                            </button>
                        </div>

                        <div className="flex gap-3 border-t border-slate-200 pt-6">
                            <button
                                type="button"
                                onClick={() => setShowRouteModal(false)}
                                className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-200"
                            >
                                CANCELAR
                            </button>
                            <button
                                type="submit"
                                className="flex-1 rounded-[1.5rem] bg-brand-600 px-4 py-5 text-sm font-black text-white shadow-xl shadow-brand-100 transition hover:bg-brand-700"
                            >
                                GUARDAR RUTA DE FABRICACIÓN
                            </button>
                        </div>
                    </form>
                </SideDrawer>
            )}
        </div>
    );
};
