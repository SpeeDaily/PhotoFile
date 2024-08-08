let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
const scale = 1.5;
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');

document.addEventListener('DOMContentLoaded', () => {
    const lazyLoadImages = document.querySelectorAll('.lazy-load');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.onload = () => img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    });

    lazyLoadImages.forEach(img => imageObserver.observe(img));
});

document.querySelector('.plus-icon-container').addEventListener('click', () => {
    document.getElementById('imageUpload').click();
});

document.getElementById('imageUpload').addEventListener('change', (event) => {
    const files = event.target.files;
    const imageCountContainer = document.getElementById('imageCountContainer');
    const fileSelectContainer = document.getElementById('fileSelectContainer');
    const imageCount = document.getElementById('imageCount');

    if (files.length > 0) {
        fileSelectContainer.style.display = 'none';
        imageCountContainer.style.display = 'block';
        imageCount.textContent = `Added ${files.length} image(s)`;
    }
});

document.getElementById('convertButton').addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const input = document.getElementById('imageUpload');
    const files = input.files;
    const fileNameInput = document.getElementById('fileName');
    let fileName = fileNameInput.value || 'document';
    const pdf = new jsPDF();
    const loader = document.getElementById('loader');
    const convertButton = document.getElementById('convertButton');
    const downloadLink = document.getElementById('downloadLink');

    if (files.length === 0) {
        const alertMessage = document.getElementById('alertMessage');
        alertMessage.textContent = "Please select at least one image.";
        const alertModal = new bootstrap.Modal(document.getElementById('alertModal'));
        alertModal.show();
        return;
    }

    loader.style.display = 'block';
    convertButton.style.display = 'none';
    fileNameInput.style.display = 'none';

    const promises = Array.from(files).map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    resolve(img);
                };
            };
            reader.readAsDataURL(file);
        });
    });

    Promise.all(promises).then(images => {
        images.forEach((img, index) => {
            if (index > 0) {
                pdf.addPage();
            }

            const imgWidth = img.width;
            const imgHeight = img.height;
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            const widthRatio = pdfWidth / imgWidth;
            const heightRatio = pdfHeight / imgHeight;
            const ratio = Math.min(widthRatio, heightRatio);

            const centeredWidth = imgWidth * ratio;
            const centeredHeight = imgHeight * ratio;

            const x = (pdfWidth - centeredWidth) / 2;
            const y = (pdfHeight - centeredHeight) / 2;

            pdf.addImage(img, 'JPEG', x, y, centeredWidth, centeredHeight);
        });

        const pdfBlob = pdf.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        downloadLink.href = url;
        downloadLink.download = `${fileName}.pdf`;
        downloadLink.style.display = 'inline-block';

        const pdfPreview = document.getElementById('pdfPreview');
        pdfPreview.style.display = 'block';

        // Initialize PDF.js for preview
        const loadingTask = pdfjsLib.getDocument(url);
        loadingTask.promise.then(pdfDoc_ => {
            pdfDoc = pdfDoc_;
            document.getElementById('pageCount').textContent = pdfDoc.numPages;
            renderPage(pageNum); // Render the first page
        });

        loader.style.display = 'none';
    });
});

document.getElementById('prevPage').addEventListener('click', () => {
    if (pageNum <= 1) {
        return;
    }
    pageNum--;
    queueRenderPage(pageNum);
});

document.getElementById('nextPage').addEventListener('click', () => {
    if (pageNum >= pdfDoc.numPages) {
        return;
    }
    pageNum++;
    queueRenderPage(pageNum);
});

function renderPage(num) {
    pageRendering = true;

    pdfDoc.getPage(num).then((page) => {
        const viewport = page.getViewport({ scale: scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        const renderTask = page.render(renderContext);

        renderTask.promise.then(() => {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    });

    document.getElementById('pageNum').textContent = num;
}

function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

document.getElementById('refreshButton').addEventListener('click', () => {
    location.reload();
});







