from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('login', views._login, name='login'),
    path('logout', views._logout, name='logout'),
    path('register', views.register, name='register'),

    #* API routes
    path('emails', views.compose, name='compose'),
    path('emails/<int:emailID>', views.email, name='email'),
    path('emails/<str:mailbox>', views.mailbox, name='mailbox')
]