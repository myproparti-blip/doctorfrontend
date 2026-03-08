import React from 'react';
import './FloatingWhatsappButton.css';

const FloatingWhatsappButton = () => {
    const whatsappMessage = 'Hello! I need assistance.';

    const handleWhatsappClick = () => {
        const encodedMessage = encodeURIComponent(whatsappMessage);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <button
            className="floating-whatsapp-btn"
            onClick={handleWhatsappClick}
            title="Chat with us on WhatsApp"
            aria-label="Open WhatsApp chat"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                width="24"
                height="24"
            >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.006a9.87 9.87 0 00-5.031 1.378c-3.055 2.364-3.905 6.75-1.9 10.247 1.33 2.324 3.72 3.924 6.266 3.924h.006c2.34 0 4.505-.931 6.169-2.625l.841 1.573c-1.282 1.335-2.926 2.271-4.129 2.758l4.015-1.353a9.9 9.9 0 001.331-11.292c-1.86-3.965-6.24-5.897-10.566-4.992z"/>
            </svg>
        </button>
    );
};

export default FloatingWhatsappButton;
