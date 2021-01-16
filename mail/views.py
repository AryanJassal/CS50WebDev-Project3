import json
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.http import JsonResponse
from django.shortcuts import HttpResponse, HttpResponseRedirect, render
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt

from .models import User, Email


def index(request): 
    if request.user.is_authenticated:
        return render(request, 'mail/inbox.html')
    else:
        return HttpResponseRedirect(reverse('login'))


@csrf_exempt
@login_required
def compose(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST request requred.'}, status=400)

    data = json.loads(request.body)
    emailIDs = [email.strip() for email in data.get('recipients').split(',')]

    if emailIDs == '': 
        return JsonResponse({'error': 'Atleast one recipient required.'}, status=400)

    recipients = []
    
    for emailID in emailIDs:
        try:
            user = User.objects.get(email=emailID)
            recipients.append(user)
        except:
            return JsonResponse({'error': f'User with email \'{emailID}\' does not exist.'}, status=400)

    subject = data.get('subject', '')
    body = data.get('body', '')

    users = set()
    users.add(request.user)
    users.update(recipients)

    for user in users:
        email = Email(
            user=user,
            sender=request.user,
            subject=subject,
            body=body,
            read=user==request.user
        )
        email.save()

        for recipient in recipients:
            email.recipients.add(recipient)
        
        email.save()

    return JsonResponse({'message': 'Email sent successfully.'}, status=201)


@login_required
def mailbox(request, mailbox):
    if mailbox == 'inbox':
        emails = Email.objects.filter(user=request.user, recipients=request.user, archived=False)
    elif mailbox == 'sent':
        emails = Email.objects.filter(user=request.user, sender=request.user)
    elif mailbox == 'archive':
        emails = Email.objects.filter(user=request.user, recipients=request.user, archived=True)
    else:
        return JsonResponse({'error': 'Invalid mailbox.'})

    emails = emails.order_by('-timestamp').all()
    return JsonResponse([email.serialize() for email in emails], safe=False)


@csrf_exempt
@login_required
def email(request, emailID):
    try:
        email = Email.objects.get(user=request.user, pk=emailID)
    except Email.DoesNotExist:
        return JsonResponse({'error', 'Email does not exist.'}, status=404)

    if request.method == 'GET':
        return JsonResponse(email.seralize())
    elif request.method == 'PUT':
        data = json.loads(request.body)

        if data.get('read') is not None:
            email.read = data['read']
        if data.get('archived') is not None:
            email.archived = data['archived']

        email.save()

        return HttpResponse(status=204)
    else:
        return JsonResponse({'error': 'Only GET or PUT commands accepted.'}, status=400)


def _login(request):
    if request.method == 'POST':
        email = request.POST['email']
        password = request.POST['password']

        user = authenticate(request, username=email, password=password)

        if user is not None:
            login(request, user)

            return HttpResponseRedirect(reverse('index'))
        else:
            return render(request, 'mail/login.html', {
                'message': 'Invalid username and/or password.'
            })
    else:
        return render(request, 'mail/login.html')


def _logout(request):
    logout(request)

    return HttpResponseRedirect(reverse('index'))

def register(request):
    if request.method == 'POST':
        email = request.POST['email']
        password = request.POST['password']
        confirmPassword = request.POST['confirmPassword']

        if password != confirmPassword:
            return render(request, 'mail/register.html', {
                'message': 'The passwords do not match.'
            })

        try:
            user = User.objects.create_user(email, email, password)
            user.save()
        except IntegrityError as e:
            print(e)
            
            return render(request, 'mail/register.html', {
                'message': 'Email ID already taken.'
            })

        login(request, user)

        return HttpResponseRedirect(reverse('index'))
    else:
        return render(request, 'mail/register.html')