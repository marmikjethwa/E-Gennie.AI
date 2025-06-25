// Configuration storage
        let config = {
            senderEmail: '',
            emailPassword: '',
        };

        let generatedEmailContent = '';


        // Load saved configuration
        function loadConfig() {
            const savedConfig = JSON.parse(localStorage.getItem('emailConfig') || '{}');
            config = { ...config, ...savedConfig };
            
            if (config.senderEmail) document.getElementById('senderEmail').value = config.senderEmail;
            if (config.emailPassword) document.getElementById('emailPassword').value = config.emailPassword;
            if (config.geminiApiKey) document.getElementById('geminiApiKey').value = config.geminiApiKey;
        }

        // Save configuration
        function saveConfig() {
            config.senderEmail = document.getElementById('senderEmail').value;
            config.emailPassword = document.getElementById('emailPassword').value;
            config.geminiApiKey = document.getElementById('geminiApiKey').value;

            localStorage.setItem('emailConfig', JSON.stringify(config));
            showStatus('Configuration saved successfully!', 'success');
        }

        // Show status message
        function showStatus(message, type) {
            const statusDiv = document.getElementById('statusMessage');
            statusDiv.textContent = message;
            statusDiv.className = `status-message status-${type}`;
            statusDiv.style.display = 'block';
            
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 5000);
        }

        // Generate email using backend API
        async function generateEmail() {
            const bulletPoints = document.getElementById('bulletPoints').value.trim();
            const subject = document.getElementById('subject').value.trim();
            
            if (!bulletPoints) {
                showStatus('Please enter bullet points first.', 'error');
                return;
            }

            const loading = document.getElementById('loading');
            const preview = document.getElementById('emailPreview');
            
            loading.classList.add('show');
            preview.style.display = 'none';

            try {
                const response = await fetch('/api/generate-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        bulletPoints: bulletPoints,
                        subject: subject
                    })
                });

                if (!response.ok) {
                    throw new Error(`API request failed: ${response.status}`);
                }

                const data = await response.json();
                generatedEmailContent = data.emailContent;

                preview.innerHTML = `<h3>📧 Generated Email</h3>${generatedEmailContent.replace(/\n/g, '<br>')}`;
                preview.style.display = 'block';
                
                document.querySelector('.btn-send').disabled = false;
                showStatus('Email generated successfully!', 'success');

            } catch (error) {
                console.error('Error generating email:', error);
                showStatus('Failed to generate email. Please check server connection and try again.', 'error');
                preview.innerHTML = `<p style="color: #dc3545;">Error generating email: ${error.message}</p>`;
                preview.style.display = 'block';
            } finally {
                loading.classList.remove('show');
            }
            document.getElementById('emailActions').style.display = 'block'; // show edit/copy buttons


        }

        // Send email via backend API
        async function sendEmail() {
            if (!generatedEmailContent) {
                showStatus('Please generate an email first.', 'error');
                return;
            }

            if (!config.senderEmail || !config.emailPassword) {
                showStatus('Please configure your email credentials first.', 'error');
                return;
            }

            const formData = {
                to: document.getElementById('to').value,
                cc: document.getElementById('cc').value,
                bcc: document.getElementById('bcc').value,
                subject: document.getElementById('subject').value,
                body: generatedEmailContent,
                senderEmail: config.senderEmail,
                senderPassword: config.emailPassword
            };

            showStatus('Sending email...', 'success');
            
            try {
                const response = await fetch('/api/send-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    throw new Error(`Failed to send email: ${response.status}`);
                }

                const result = await response.json();
                showStatus(`Email sent successfully to ${formData.to}!`, 'success');
                
                // Reset form after successful send
                document.getElementById('emailForm').reset();
                document.getElementById('emailPreview').innerHTML = '<p style="color: #6c757d; font-style: italic;">Click "Generate Email" to see the AI-generated email preview here.</p>';
                document.querySelector('.btn-send').disabled = true;
                generatedEmailContent = '';

            } catch (error) {
                console.error('Error sending email:', error);
                showStatus(`Failed to send email: ${error.message}`, 'error');
            }
        }

        let originalGeneratedEmail = '';

function editEmail() {
    originalGeneratedEmail = generatedEmailContent;
    document.getElementById('editableEmail').value = generatedEmailContent;
    document.getElementById('emailEditor').style.display = 'block';
    document.getElementById('emailPreview').style.display = 'none';
    document.getElementById('emailActions').style.display = 'none';
}

function saveEditedEmail() {
    generatedEmailContent = document.getElementById('editableEmail').value.trim();
    document.getElementById('emailPreview').innerHTML = `<h3>📧 Edited Email</h3>${generatedEmailContent.replace(/\n/g, '<br>')}`;
    document.getElementById('emailPreview').style.display = 'block';
    document.getElementById('emailEditor').style.display = 'none';
    document.getElementById('emailActions').style.display = 'block';
    showStatus('Email content updated.', 'success');
}

function discardEdit() {
    generatedEmailContent = originalGeneratedEmail;
    document.getElementById('emailPreview').innerHTML = `<h3>📧 Email Preview</h3>${generatedEmailContent.replace(/\n/g, '<br>')}`;
    document.getElementById('emailPreview').style.display = 'block';
    document.getElementById('emailEditor').style.display = 'none';
    document.getElementById('emailActions').style.display = 'block';
    showStatus('Changes discarded.', 'error');
}



function copyEmail() {
    const promoText = `

----------------------------
Found this email helpful? Generate your own at https://e-gennieai.up.railway.app/
`;


    const emailText = document.getElementById('emailPreview')?.innerText || '';
    const fullText = emailText + promoText;

    navigator.clipboard.writeText(fullText)
        .then(() => {
            const statusDiv = document.getElementById('statusMessage');
            if (statusDiv) {
                statusDiv.textContent = " Email copied";
                statusDiv.classList.add('status-success');
                statusDiv.style.display = 'block';

                setTimeout(() => {
                    statusDiv.style.display = 'none';
                    statusDiv.textContent = '';
                    statusDiv.classList.remove('status-success');
                }, 3000);
            }
        })
        .catch(err => {
            const statusDiv = document.getElementById('statusMessage');
            if (statusDiv) {
                statusDiv.textContent = "Failed to copy email.";
                statusDiv.classList.add('status-error');
                statusDiv.style.display = 'block';

                setTimeout(() => {
                    statusDiv.style.display = 'none';
                    statusDiv.textContent = '';
                    statusDiv.classList.remove('status-error');
                }, 3000);
            }
            console.error(" Failed to copy:", err);
        });
}

function openTranslateModal() {
    document.getElementById('translateModal').style.display = 'flex';
}

function closeTranslateModal() {
    document.getElementById('translateModal').style.display = 'none';
    document.getElementById('translatedOutput').innerHTML = '';
}

async function translateEmail() {
    const lang = document.getElementById('targetLanguage').value;
    const text = generatedEmailContent;

    try {
        const response = await fetch("https://libretranslate.de/translate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                q: text,
                source: "en",
                target: lang,
                format: "text"
            })
        });

        const data = await response.json();
        document.getElementById('translatedOutput').innerHTML = `
            <h4>🌐 Translated Email:</h4>
            <p style="text-align: left; margin-top: 10px;">${data.translatedText.replace(/\n/g, '<br>')}</p>
        `;
    } catch (err) {
        console.error("Translation error:", err);
        document.getElementById('translatedOutput').innerHTML = `<p style="color: red;">Failed to translate. Try again.</p>`;
    }
}





        // Initialize the application
        document.addEventListener('DOMContentLoaded', function() {
            loadConfig();
        });
