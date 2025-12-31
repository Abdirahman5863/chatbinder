const PDFDocument = require('pdfkit');
const logger = require('../utils/logger');

async function exportToPDF(binder) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const chunks = [];

            // Collect PDF data
            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Add title
            doc.fontSize(24).text(binder.name, { align: 'center' });
            doc.moveDown();

            // Add metadata
            doc.fontSize(10).text(`Created: ${new Date(binder.created_at).toLocaleDateString()}`, { align: 'center' });
            if (binder.description) {
                doc.text(binder.description, { align: 'center' });
            }
            doc.moveDown(2);

            // Add content
            if (binder.binder_chats && binder.binder_chats.length > 0) {
                binder.binder_chats.forEach((bc, index) => {
                    if (bc.chat) {
                        // Chat title
                        doc.fontSize(16).text(`Chat ${index + 1}: ${bc.chat.title}`, { underline: true });
                        doc.moveDown(0.5);
                        
                        // Chat metadata
                        doc.fontSize(9).fillColor('#666666');
                        doc.text(`Source: ${bc.chat.source} | Date: ${new Date(bc.chat.created_at).toLocaleDateString()}`);
                        doc.fillColor('#000000');
                        doc.moveDown();

                        // Chat chunks/content
                        if (bc.chat.chunks && bc.chat.chunks.length > 0) {
                            bc.chat.chunks.forEach(chunk => {
                                doc.fontSize(11).text(chunk.content, {
                                    align: 'left',
                                    lineGap: 3
                                });
                                doc.moveDown(0.5);
                            });
                        } else {
                            doc.fontSize(10).fillColor('#999999');
                            doc.text('No content available');
                            doc.fillColor('#000000');
                        }

                        doc.moveDown(2);
                        
                        // Add page break if not last chat
                        if (index < binder.binder_chats.length - 1) {
                            doc.addPage();
                        }
                    }
                });
            } else {
                doc.fontSize(12).fillColor('#999999');
                doc.text('This binder is empty. Add chats to get started.');
                doc.fillColor('#000000');
            }

            // Finalize PDF
            doc.end();

            logger.info(`PDF generated for binder: ${binder.name}`);

        } catch (error) {
            logger.error(`Error generating PDF: ${error.message}`);
            reject(error);
        }
    });
}

async function exportToMarkdown(binder) {
    let markdown = `# ${binder.name}\n\n`;

    if (binder.description) {
        markdown += `${binder.description}\n\n`;
    }

    markdown += `**Created:** ${new Date(binder.created_at).toLocaleDateString()}\n\n`;
    markdown += `---\n\n`;

    if (binder.binder_chats && binder.binder_chats.length > 0) {
        binder.binder_chats.forEach((bc, index) => {
            if (bc.chat) {
                markdown += `## Chat ${index + 1}: ${bc.chat.title}\n\n`;
                markdown += `**Source:** ${bc.chat.source} | **Date:** ${new Date(bc.chat.created_at).toLocaleDateString()}\n\n`;

                if (bc.chat.chunks && bc.chat.chunks.length > 0) {
                    bc.chat.chunks.forEach(chunk => {
                        markdown += chunk.content + '\n\n';
                    });
                }

                markdown += `---\n\n`;
            }
        });
    } else {
        markdown += `*This binder is empty. Add chats to get started.*\n\n`;
    }

    logger.info(`Markdown generated for binder: ${binder.name}`);
    return markdown;
}

module.exports = {
    exportToPDF,
    exportToMarkdown
};