// You will see /*html*/ before strings with html in them because I am using an extension for html syntax highlighting in a string (es6-string-html) and it requires it as a prefix.

document.addEventListener('DOMContentLoaded', function()
{
    document.querySelector('#inbox').addEventListener('click', () => loadMailbox('inbox'));
    document.querySelector('#sent').addEventListener('click', () => loadMailbox('sent'));
    document.querySelector('#archived').addEventListener('click', () => loadMailbox('archive'));
    document.querySelector('#compose').addEventListener('click', composeMail);

    loadMailbox('inbox');
});

function composeMail()
{
    document.querySelector('#emails-view').style.display = 'none';
    document.querySelector('#expanded-emails-view').style.display = 'none';
    document.querySelector('#compose-view').style.display = 'block';

    document.querySelector('#compose-recipients').value = '';
    document.querySelector('#compose-subject').value = '';
    document.querySelector('#compose-body').value = '';

    document.querySelector('#compose-form').onsubmit = function()
    {
        fetch('/emails', {
            method: 'POST',
            body: JSON.stringify({
                recipients: document.querySelector('#compose-recipients').value,
                subject: document.querySelector('#compose-subject').value,
                body: document.querySelector('#compose-body').value,
                read: false
            }) 
        })
        .then(response => response.json())
        .then(result => {
            console.log(result);
        });

        loadMailbox('sent');

        return false;
    };
}

function loadMailbox(mailbox)
{
    document.querySelector('#emails-view').style.display = 'block';
    document.querySelector('#expanded-emails-view').style.display = 'none';
    document.querySelector('#compose-view').style.display = 'none';

    document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

    fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(emails =>
    {
        console.log(emails)

        if (emails.length === 0)
        {
            const element = document.createElement('div');

            element.innerHTML = 'No emails found.';
            document.querySelector('#emails-view').append(element);
        }

        else
        {
            for (let email of emails)
            {
                const element = document.createElement('div');
                element.setAttribute('class', 'row mt-4');
                element.style.height = '60px';
                element.style.borderRadius = '5px';
                element.style.border = '1px solid gray';
                element.style.cursor = 'pointer';

                if (email.read == true)
                {
                    element.style.backgroundColor = 'lightgray';
                }
                else
                {
                    element.style.backgroundColor = 'white';
                }

                element.addEventListener('click', () => loadMail(email))

                element.innerHTML = /*html*/ `
                    <div class="col p-3 container-fluid">
                        <div class="float-left"><strong>${email.sender}</strong></div>
                        <div class="float-left ml-3">${email.subject}</div>
                        <div class="float-right ml-3">${email.timestamp}</div>
                    </div>
                `;

                document.querySelector('#emails-view').append(element);
            }
        }
    });
}

function loadMail(email)
{
    document.querySelector('#emails-view').style.display = 'none';
    document.querySelector('#expanded-emails-view').style.display = 'block';
    document.querySelector('#compose-view').style.display = 'none';

    console.log(email);

    fetch(`emails/${email.id}`, {
        method: 'PUT',
        body: JSON.stringify({
            read: true
        })
    })

    document.querySelector('#expanded-emails-view').innerHTML = /*html*/`
        <div class="p-2"><strong>From: </strong>${email.sender}</div>
        <div class="p-2"><strong>To: </strong>${email.recipients}</div>
        <div class="p-2"><strong>Subject: </strong>${email.subject}</div>
        <div class="p-2"><strong>Received: </strong>${email.timestamp}</div>
        <button class="btn btn-${email.archived ? "danger" : "primary"}" id="archive">${email.archived ? "Unarchive" : "Archive"}</button>
        <button class="btn btn-primary" id="reply">Reply</button>
        <div class="mt-3 pl-2" style="white-space: pre-line;">${email.body}</div>
    `;

    document.querySelector('#archive').addEventListener('click', () =>
    {
        fetch(`emails/${email.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                archived: !email.archived
            })
        })
        .then(() => loadMailbox('inbox'));
    });

    document.querySelector('#reply').addEventListener('click', () => 
    {
        composeMail();

        if (email.subject.slice(0, 4) != 'Re: ')
        {
            email.subject = `Re: ${email.subject}`;
        }

        document.querySelector('#compose-recipients').value = email.sender;
        document.querySelector('#compose-subject').value = `${email.subject}`;
        document.querySelector('#compose-body').value = `On ${email.timestamp}, ${email.sender} wrote:\n"${email.body}"\n\n`;
    });
}